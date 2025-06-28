# Location: ai-service/main.py
# ACTION: Replace the contents of this file with this final, complete version.

import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
import json

# Load environment variables
load_dotenv()

# --- API CONFIGURATION ---
app = FastAPI()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
SEARCH_ENGINE_ID = os.getenv("SEARCH_ENGINE_ID")
SEARCH_URL = "https://www.googleapis.com/customsearch/v1"

# --- DATA MODELS ---
class Claim(BaseModel):
    text: str

# --- PROMPT ENGINEERING ---
socratic_prompt = """
You are a Socratic moderator and a master of lateral thinking, currently working on a visual debate platform.
Your primary goal is to generate a single, non-obvious, and deeply insightful question based on the user's claim below.
CRITICAL INSTRUCTIONS:
1.  DO NOT repeat questions or provide generic, common-knowledge inquiries. Every question must be novel.
2.  Your question must challenge the underlying assumptions of the user's claim.
3.  The question should be concise and formatted as a single sentence.
4.  Do not answer or comment on the claim. Only ask the question.
USER'S CLAIM: "{claim_text}"
YOUR UNIQUE INSIGHTFUL QUESTION:
"""

researcher_prompt = """
You are a world-class investigative journalist and research assistant.
Your sole purpose is to convert a user's claim into a set of 3 distinct, high-quality Google search queries that would find factual evidence, studies, or reputable articles to support or refute the claim.
Return ONLY a JSON array of strings. Do not include any other text or explanation.
USER'S CLAIM: "{claim_text}"
JSON ARRAY OF SEARCH QUERIES:
"""

analyst_prompt = """
You are a meticulous data analyst and summarizer.
Based on the provided list of Google Search results, your task is to identify the top 2 most authoritative and relevant sources.
For each of the top 2 sources, provide a one-sentence summary of the key finding and the direct URL.
Return ONLY a JSON object with a key "evidence" which is an array of objects, each with a "summary" and "url" key.
SEARCH RESULTS:
{search_results}
JSON EVIDENCE OBJECT:
"""

# --- AI & TOOL SETUP ---
model = genai.GenerativeModel('gemini-2.5-flash')

def perform_google_search(query: str):
    params = {'key': SEARCH_API_KEY, 'cx': SEARCH_ENGINE_ID, 'q': query}
    response = requests.get(SEARCH_URL, params=params)
    response.raise_for_status()
    return response.json()

def clean_and_parse_json(raw_text: str):
    start_index = raw_text.find('[') if raw_text.find('[') != -1 else raw_text.find('{')
    end_index = raw_text.rfind(']') if raw_text.rfind(']') != -1 else raw_text.rfind('}')
    if start_index != -1 and end_index != -1:
        json_str = raw_text[start_index : end_index + 1]
        return json.loads(json_str)
    raise ValueError("No valid JSON found in the AI response")

# --- API ENDPOINTS ---

# --- THIS IS THE FIX ---
# This function now has the correct logic to call the AI and return a question.
@app.post("/generate-question")
async def generate_question(claim: Claim):
    try:
        prompt_with_claim = socratic_prompt.format(claim_text=claim.text)
        generation_config = genai.types.GenerationConfig(temperature=0.9)
        response = model.generate_content(
            prompt_with_claim,
            generation_config=generation_config
        )
        return {"question": response.text}
    except Exception as e:
        if "429" in str(e) and "quota" in str(e).lower():
            print("RATE LIMIT EXCEEDED.")
            return {"error": "RATE_LIMIT"}
        print(f"An unexpected error occurred in generate_question: {e}")
        return {"error": "Failed to generate question from AI model."}

@app.post("/find-evidence")
async def find_evidence(claim: Claim):
    try:
        researcher_prompt_with_claim = researcher_prompt.format(claim_text=claim.text)
        researcher_response = model.generate_content(researcher_prompt_with_claim)
        search_queries = clean_and_parse_json(researcher_response.text)
        print(f"AI generated search queries: {search_queries}")

        all_search_results = []
        for query in search_queries:
            search_result = perform_google_search(query)
            if 'items' in search_result:
                all_search_results.extend(search_result['items'])
        
        formatted_results = "\n".join([f"Title: {item.get('title')}, Snippet: {item.get('snippet')}" for item in all_search_results])

        analyst_prompt_with_results = analyst_prompt.format(search_results=formatted_results)
        analyst_response = model.generate_content(analyst_prompt_with_results)
        parsed_evidence = clean_and_parse_json(analyst_response.text)
        
        final_evidence = {}
        if isinstance(parsed_evidence, list):
            final_evidence = {"evidence": parsed_evidence}
        elif isinstance(parsed_evidence, dict) and "evidence" in parsed_evidence:
            final_evidence = parsed_evidence
        else:
            raise ValueError("Parsed evidence is not in a recognized format.")

        print(f"AI extracted evidence: {final_evidence}")
        return final_evidence

    except Exception as e:
        print(f"An error occurred in the evidence engine: {e}")
        raise HTTPException(status_code=500, detail="Failed to process evidence search.")
