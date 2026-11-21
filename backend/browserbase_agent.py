import json
import os
import re
from urllib.parse import quote, urlparse, parse_qs
import base64

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

GEMINI_MODEL = "gemini-3.5-flash"
CORTEX_MODEL = "llama3.1-8b"


def cortex(prompt):
    from snowflake_client import execute_query

    rows = execute_query(
        "SELECT AI_COMPLETE(%s, %s)",
        (CORTEX_MODEL, prompt),
    )
    return str(rows[0][0]).strip()


def gemini_client():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None

    from google import genai
    return genai.Client(api_key=key)


def clean_query(value):
    value = re.sub(r'[\r\n"`]', " ", str(value))
    return " ".join(value.split())[:140]


def generate_queries(building, campus):
    # Public building labels only. Never send raw utility records.
    prompt = f"""
Rutgers University public-building research.

Building label: {building}
Campus: {campus}

Generate two short web search queries for finding official
Rutgers webpages about this building.

Remove internal abbreviations and utility labels.
Prefer the public-facing building name.

Return a JSON array containing exactly two strings.
No explanations and no invented facts.
"""

    client = gemini_client()

    if client:
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
            values = json.loads(response.text)

            if isinstance(values, list) and values:
                queries = [clean_query(q) for q in values[:2]]
                print("Query provider: Gemini", flush=True)
                return queries, "gemini"
        except Exception as exc:
            print("Gemini query fallback:", str(exc)[:200], flush=True)

    try:
        response = cortex(prompt)
        match = re.search(r"\[[\s\S]*?\]", response)

        if match:
            values = json.loads(match.group(0))
            if isinstance(values, list) and values:
                queries = [clean_query(q) for q in values[:2]]
                print("Query provider: Cortex", flush=True)
                return queries, "cortex"

        print("Cortex returned non-JSON output; using basic queries", flush=True)

    except Exception as exc:
        print("Cortex query fallback:", str(exc)[:200], flush=True)

    fallback = building.split(" - ")[0].strip()

    if "Hahne" in building:
        fallback = "Express Newark Hahne"

    print("Query provider: basic fallback", flush=True)
    return [
        clean_query(f"{fallback} Rutgers {campus}"),
        clean_query(f"{fallback} Rutgers building"),
    ], "basic"



def resolve_bing_url(url):
    parsed = urlparse(url)

    if parsed.hostname not in ("bing.com", "www.bing.com"):
        return url

    values = parse_qs(parsed.query).get("u", [])

    if not values:
        return url

    encoded = values[0]

    if encoded.startswith("a1"):
        encoded = encoded[2:]

    try:
        encoded += "=" * (-len(encoded) % 4)
        decoded = base64.urlsafe_b64decode(encoded).decode("utf-8")
        return decoded
    except Exception:
        return url


def rutgers_url(url):
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()

        return (
            parsed.scheme == "https"
            and (
                host == "rutgers.edu"
                or host.endswith(".rutgers.edu")
                or host in ("expressnewark.org", "www.expressnewark.org")
            )
        )
    except ValueError:
        return False


def analyze_page(screenshot, text, building):
    client = gemini_client()

    prompt = f"""
Analyze public Rutgers webpage information about:
{building}

Identify building-related renovations, construction,
sustainability initiatives, or energy-related information.

Distinguish observed facts from speculation.
Do not claim a webpage proves an electricity anomaly.
If the page is unrelated, explicitly say so.

Return a concise explanation under 150 words.
"""

    if client:
        try:
            from google.genai import types

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    prompt,
                    types.Part.from_bytes(
                        data=screenshot,
                        mime_type="image/png",
                    ),
                ],
            )

            if response.text:
                return response.text, "gemini_vision"

        except Exception as exc:
            print("Gemini vision fallback:", str(exc)[:200], flush=True)

    try:
        response = cortex(
            prompt + "\n\nPublic webpage text:\n" + text[:3500]
        )
        return response, "cortex_text"

    except Exception as exc:
        print("Cortex analysis fallback:", str(exc)[:200], flush=True)

    return "Public webpage retrieved; AI analysis unavailable.", "none"



def known_building_urls(building):
    name = building.lower()

    if "hahne" in name or "express newark" in name:
        return [
            {
                "title": "Express Newark",
                "url": "https://www.expressnewark.org/"
            }
        ]

    return []


def gather_evidence(building, campus):
    key = os.getenv("BROWSERBASE_API_KEY")
    project = os.getenv("BROWSERBASE_PROJECT_ID")

    if not key or not project:
        raise RuntimeError("Missing Browserbase credentials")

    queries, query_provider = generate_queries(building, campus)

    client = Browserbase(api_key=key)
    session = client.sessions.create(project_id=project)

    result = {
        "status": "completed",
        "building": building,
        "campus": campus,
        "session_id": session.id,
        "search_queries": queries,
        "query_provider": query_provider,
        "sources": [],
        "limitations": (
            "Public webpages are contextual information, "
            "not proof of the cause of an electricity anomaly."
        ),
    }

    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(
            session.connect_url
        )

        try:
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()
            page.set_default_timeout(10000)
            page.set_default_navigation_timeout(15000)
            seen = set()


            # Visit known building-specific sources before search results.
            for source in known_building_urls(building):
                if len(result["sources"]) >= 2:
                    break

                url = source["url"]

                if not rutgers_url(url) or url in seen:
                    continue

                seen.add(url)

                try:
                    print("Direct source:", url, flush=True)
                    page.goto(
                        url,
                        wait_until="domcontentloaded",
                        timeout=12000,
                    )

                    body = page.locator("body").inner_text(timeout=8000)
                    title = page.title()

                    if len(body.strip()) < 100:
                        continue

                    screenshot = page.screenshot(
                        type="png",
                        timeout=10000,
                    )

                    analysis, provider = analyze_page(
                        screenshot, body, building
                    )

                    result["sources"].append({
                        "title": title or source["title"],
                        "url": page.url,
                        "excerpt": body[:1500],
                        "analysis": analysis,
                        "analysis_provider": provider,
                        "evidence_type": "public_webpage_context",
                    })

                    print(
                        "Visited:", page.url,
                        "| Analyzed by:", provider,
                        flush=True,
                    )

                except Exception as exc:
                    print(
                        "Direct source failed:",
                        str(exc)[:250],
                        flush=True,
                    )

            for query in queries[:2]:
                if len(result["sources"]) >= 2:
                    break

                search_url = (
                    "https://www.bing.com/search?q="
                    + quote("site:rutgers.edu " + query)
                )

                try:
                    search_page = context.new_page()
                    search_page.goto(
                        search_url,
                        wait_until="commit",
                        timeout=20000,
                    )
                    search_page.wait_for_load_state(
                        "domcontentloaded",
                        timeout=15000,
                    )
                    search_page.wait_for_timeout(1500)

                    links = search_page.locator("li.b_algo h2 a").evaluate_all(
                        """els => els.map(a => ({
                            title: a.innerText,
                            url: a.href
                        }))"""
                    )

                    print("First search results:", links[:3], flush=True)

                    print("Search links:", len(links), flush=True)

                except Exception as exc:
                    print("Search failed:", str(exc)[:200], flush=True)
                    continue

                for link in links:
                    if len(result["sources"]) >= 2:
                        break

                    url = resolve_bing_url(link.get("url", ""))

                    if url in seen:
                        continue

                    # Bing sometimes returns redirect links.
                    if not rutgers_url(url):
                        print("Non-Rutgers search URL:", url[:180], flush=True)
                        continue
                        continue

                    seen.add(url)

                    try:
                        page.goto(
                            url,
                            wait_until="commit",
                            timeout=12000,
                        )
                        page.wait_for_timeout(800)

                        if not rutgers_url(page.url):
                            continue

                        title = page.title()
                        body = page.locator("body").inner_text(
                            timeout=10000
                        )

                        if len(body.strip()) < 100:
                            continue

                        # Require building-specific text before analysis.
                        # This avoids wasting Gemini calls on generic pages.
                        lower_body = body.lower()
                        lower_title = title.lower()

                        if "Hahne" in building or "Express Newark" in building:
                            relevant = (
                                "hahne" in lower_body
                                or "express newark" in lower_body
                                or "hahne" in lower_title
                            )
                        else:
                            words = [
                                word.lower()
                                for word in building.replace("-", " ").split()
                                if len(word) >= 5
                                and word.lower() not in (
                                    "building", "company", "rutgers",
                                    "campus", "parking", "center"
                                )
                            ]

                            relevant = any(
                                word in lower_body or word in lower_title
                                for word in words
                            )

                        if not relevant:
                            print(
                                "Skipping unrelated page:", page.url,
                                flush=True
                            )
                            continue

                        screenshot = page.screenshot(
                            type="png",
                            full_page=False,
                        )

                        analysis, provider = analyze_page(
                            screenshot, body, building
                        )

                        result["sources"].append({
                            "title": title,
                            "url": page.url,
                            "excerpt": body[:1500],
                            "analysis": analysis,
                            "analysis_provider": provider,
                            "evidence_type": "public_webpage_context",
                        })

                        print(
                            "Visited:", page.url,
                            "| Analyzed by:", provider,
                            flush=True,
                        )

                    except Exception as exc:
                        print("Page failed:", str(exc)[:200], flush=True)

        finally:
            browser.close()

    result["source_count"] = len(result["sources"])

    if not result["sources"]:
        result["status"] = "no_relevant_sources"

    return result


if __name__ == "__main__":
    result = gather_evidence(
        "Hahne and Company HAH - Express Newark",
        "Newark",
    )

    print(json.dumps(result, indent=2))
