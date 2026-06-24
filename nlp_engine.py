import re
import os
import json
import collections
import google.generativeai as genai

# A solid list of English stop words to exclude during frequency analysis
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "because", "as", "what", "how", 
    "why", "when", "where", "which", "this", "that", "these", "those", "then", 
    "there", "here", "to", "for", "of", "in", "on", "at", "by", "with", "from", 
    "about", "into", "through", "during", "before", "after", "above", "below", 
    "up", "down", "out", "off", "over", "under", "again", "further", "once", 
    "all", "any", "both", "each", "few", "more", "most", "other", "some", 
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", 
    "very", "can", "will", "just", "should", "now", "i", "me", "my", "myself", 
    "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", 
    "yourselves", "he", "him", "his", "himself", "she", "her", "hers", 
    "herself", "it", "its", "itself", "they", "them", "their", "theirs", 
    "themselves", "is", "was", "are", "were", "be", "been", "being", "have", 
    "has", "had", "having", "do", "does", "did", "doing", "would", "should", 
    "could", "ought", "also", "its", "dont", "cant", "wont"
}

def split_into_sentences(text):
    """Splits text into sentences using regex heuristics, handling abbreviations."""
    # Handle abbreviations to prevent false splits
    text = re.sub(r'(?<=e\.g\.)|(?<=i\.e\.)|(?<=Dr\.)|(?<=Mr\.)|(?<=Ms\.)|(?<=Prof\.)', ' ', text)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def split_into_paragraphs(text):
    """Splits text into paragraphs by splitting on newlines."""
    paragraphs = re.split(r'\n+', text)
    return [p.strip() for p in paragraphs if p.strip()]

def get_keywords(text, num_keywords=5):
    """Extracts top keywords based on term frequency."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    content_words = [w for w in words if w not in STOPWORDS]
    counter = collections.Counter(content_words)
    return [item[0] for item in counter.most_common(num_keywords)]

def generate_local_notes(text):
    """
    Local NLP-based note generation engine.
    Performs extractive summarization, key phrase discovery, 
    and structured bullet points with headings.
    """
    sentences = split_into_sentences(text)
    paragraphs = split_into_paragraphs(text)
    
    if not sentences:
        return {
            "summary": "No text content found to summarize.",
            "key_points": "- No content provided.",
            "structured_notes": "### Empty Content\nNo content was provided for notes generation."
        }
        
    # --- WORD FREQUENCY ANALYSIS ---
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    content_words = [w for w in words if w not in STOPWORDS]
    
    word_frequencies = collections.Counter(content_words)
    max_frequency = max(word_frequencies.values()) if word_frequencies else 1
    
    # Normalize frequencies
    normalized_frequencies = {word: freq / max_frequency for word, freq in word_frequencies.items()}
    
    # --- SENTENCE SCORING ---
    sentence_scores = {}
    for i, sentence in enumerate(sentences):
        sentence_words = re.findall(r'\b[a-zA-Z]{3,}\b', sentence.lower())
        score = 0
        word_count = 0
        for word in sentence_words:
            if word in normalized_frequencies:
                score += normalized_frequencies[word]
                word_count += 1
        
        # Penalize extremely long or short sentences, score by average density
        if word_count > 0:
            sentence_scores[i] = score / word_count
        else:
            sentence_scores[i] = 0
            
    # --- SUMMARY GENERATION (Extractive) ---
    # Select top 20-30% of sentences (minimum 2, maximum 6)
    num_summary_sentences = max(2, min(6, int(len(sentences) * 0.25)))
    top_sentence_indices = sorted(sentence_scores, key=sentence_scores.get, reverse=True)[:num_summary_sentences]
    top_sentence_indices.sort() # Keep original reading order
    
    summary_sentences = [sentences[idx] for idx in top_sentence_indices]
    summary = " ".join(summary_sentences)
    
    # --- KEY POINTS GENERATION ---
    # Select high-scoring sentences that contain key phrases, or top 5 highest scorers
    signal_words = ["important", "key", "remember", "significance", "critical", "focus", "therefore", "conclude", "result"]
    key_points_candidates = []
    
    for idx, sentence in enumerate(sentences):
        # Boost sentences containing signal words
        score = sentence_scores[idx]
        if any(sig in sentence.lower() for sig in signal_words):
            score *= 1.5
        key_points_candidates.append((score, sentence))
        
    # Sort candidates and take top 5 (or fewer if short)
    key_points_candidates.sort(key=lambda x: x[0], reverse=True)
    num_key_points = max(2, min(5, len(sentences)))
    selected_key_points = [item[1] for item in key_points_candidates[:num_key_points]]
    
    # Format key points as Markdown bullet list
    key_points_md = "\n".join([f"- {sentence}" for sentence in selected_key_points])
    
    # --- STRUCTURED NOTES ---
    # Create structured notes grouped by paragraph. Under each paragraph title, list details.
    structured_notes_md = []
    
    keywords = get_keywords(text, num_keywords=8)
    title_topic = keywords[0].title() if keywords else "Study Material"
    structured_notes_md.append(f"# Detailed Notes: {title_topic}\n")
    
    for p_idx, paragraph in enumerate(paragraphs):
        p_sentences = split_into_sentences(paragraph)
        if not p_sentences:
            continue
            
        # Heading: Choose first sentence if short, or extract high-scoring noun phrases/keywords
        heading_text = p_sentences[0]
        if len(heading_text) > 60:
            # Cut at a comma or end of a phrase, or just truncate with ...
            heading_text = heading_text[:57] + "..."
            
        p_keywords = get_keywords(paragraph, num_keywords=3)
        if p_keywords:
            heading_topic = " & ".join([w.title() for w in p_keywords])
            heading = f"## Section {p_idx + 1}: {heading_topic}"
        else:
            heading = f"## Section {p_idx + 1}: Key Concepts"
            
        structured_notes_md.append(heading)
        
        # Bullets for this paragraph: Take sentences that aren't the heading, or select top sentences
        bullets = []
        for s in p_sentences:
            # Clean and add as bullet if it has substance
            clean_s = s.strip()
            if len(clean_s) > 15:
                bullets.append(f"- {clean_s}")
                
        # Limit bullets per section to 3 for readability
        if bullets:
            structured_notes_md.extend(bullets[:4])
        else:
            # Fallback bullet
            structured_notes_md.append(f"- Discusses topics related to {', '.join(keywords[:3])}.")
            
        structured_notes_md.append("") # Spacer
        
    structured_notes = "\n".join(structured_notes_md)
    
    return {
        "summary": summary,
        "key_points": key_points_md,
        "structured_notes": structured_notes
    }

def generate_ai_notes(text, api_key):
    """
    Connects to Google Gemini API to generate structured notes,
    a summary, and key points in JSON format.
    """
    genai.configure(api_key=api_key)
    
    system_prompt = (
        "You are NoteGenius, a professional AI study assistant. Your goal is to analyze the student's study material "
        "and produce a comprehensive, structured set of notes. The user needs three outputs: "
        "1. A clean, concise Summary (2-4 sentences max summarizing the core theme). "
        "2. Key Points (a markdown-formatted bullet list containing the most critical facts, formulas, or takeaways). "
        "3. Structured Notes (hierarchical markdown notes with clear headers, subheaders, and bullet points, organized logically)."
    )
    
    prompt = (
        f"Analyze the following study material and generate a summary, key points, and highly detailed structured notes.\n\n"
        f"STUDY MATERIAL:\n{text}\n\n"
        f"Return the output as a valid JSON object matching this structure EXACTLY (do not wrap in markdown code blocks unless it's standard json):\n"
        f"{{\n"
        f"  \"summary\": \"The summary text...\",\n"
        f"  \"key_points\": \"- Bullet point 1\\n- Bullet point 2...\",\n"
        f"  \"structured_notes\": \"# Title\\n\\n## Heading\\n- Detail 1\\n- Detail 2...\"\n"
        f"}}"
    )
    
    try:
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        response = model.generate_content([system_prompt, prompt])
        
        # Parse the JSON response
        result_json = json.loads(response.text.strip())
        return {
            "summary": result_json.get("summary", ""),
            "key_points": result_json.get("key_points", ""),
            "structured_notes": result_json.get("structured_notes", "")
        }
    except Exception as e:
        print(f"Gemini API Error: {str(e)}. Falling back to local NLP engine.")
        # Fall back to local engine
        return generate_local_notes(text)

def generate_study_materials(text, api_key=None):
    """
    Main entry point. Automatically routes to Gemini AI if API key is present,
    otherwise uses the local NLP text-processing engine.
    """
    # Strip whitespace and check if text is empty
    cleaned_text = text.strip() if text else ""
    if not cleaned_text:
        return {
            "summary": "No text content found to summarize.",
            "key_points": "- No content provided.",
            "structured_notes": "### Empty Content\nNo content was provided for notes generation."
        }
        
    if api_key and api_key.strip():
        return generate_ai_notes(cleaned_text, api_key)
    else:
        return generate_local_notes(cleaned_text)
