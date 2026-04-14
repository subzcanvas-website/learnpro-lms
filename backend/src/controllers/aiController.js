const db = require('../config/db');

// ─── AI Provider helper ──────────────────────────────────────────────────────
// Supports both Anthropic Claude and OpenAI — uses whichever key is configured
async function callAI(prompt, systemPrompt = '', jsonMode = false) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openaiKey) {
    throw new Error('No AI API key configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to your .env file.');
  }

  // ── Anthropic Claude (preferred) ──────────────────────────────────────────
  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            anthropicKey,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system:     systemPrompt || 'You are an expert instructional designer and LMS content creator. Always respond with valid JSON when asked.',
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Claude API error: ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    if (jsonMode) {
      const match = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      return JSON.parse(match ? match[1] : text);
    }
    return text;
  }

  // ── OpenAI fallback ───────────────────────────────────────────────────────
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model:       'gpt-4o',
      max_tokens:  4096,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: systemPrompt || 'You are an expert instructional designer.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI API error: ${err.error?.message || response.statusText}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (jsonMode) return JSON.parse(text);
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/generate-course
// Body: { topic, level, duration_hours, target_audience, language }
// ─────────────────────────────────────────────────────────────────────────────
const generateCourse = async (req, res) => {
  try {
    const {
      topic, level = 'beginner',
      duration_hours = 2,
      target_audience = 'professionals',
      language = 'English',
      num_modules = 4,
    } = req.body;

    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const prompt = `
Create a complete course outline for an LMS platform.

Topic: ${topic}
Level: ${level}
Duration: ${duration_hours} hours
Target Audience: ${target_audience}
Language: ${language}
Number of Modules: ${num_modules}

Return ONLY a JSON object with this exact structure:
{
  "title": "Course title",
  "description": "2-3 sentence course description",
  "category": "one of: onboarding|technical|compliance|soft-skills|leadership|sales|product",
  "level": "${level}",
  "learning_objectives": ["objective 1", "objective 2", "objective 3"],
  "modules": [
    {
      "title": "Module title",
      "description": "Module description",
      "lessons": [
        {
          "title": "Lesson title",
          "content_type": "text",
          "duration_minutes": 10,
          "content_body": "Full lesson content — at least 3 paragraphs of detailed, educational content. Include examples, key concepts, and practical applications."
        }
      ]
    }
  ]
}

Make all content detailed, practical, and immediately usable. Each lesson must have substantial content_body.`;

    const course = await callAI(prompt, '', true);
    res.json({ success: true, course });

  } catch (err) {
    console.error('[AI generateCourse]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/generate-quiz
// Body: { topic, num_questions, difficulty, course_content }
// ─────────────────────────────────────────────────────────────────────────────
const generateQuiz = async (req, res) => {
  try {
    const {
      topic,
      num_questions = 10,
      difficulty = 'medium',
      course_content = '',
      question_types = ['mcq', 'true_false'],
    } = req.body;

    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const prompt = `
Create a quiz for an LMS platform.

Topic: ${topic}
Number of Questions: ${num_questions}
Difficulty: ${difficulty}
Question Types: ${question_types.join(', ')}
${course_content ? `Course Content Context:\n${course_content.slice(0, 2000)}` : ''}

Return ONLY a JSON object:
{
  "title": "Quiz title",
  "description": "Brief quiz description",
  "time_limit_minutes": ${Math.ceil(num_questions * 1.5)},
  "pass_percentage": ${difficulty === 'easy' ? 60 : difficulty === 'hard' ? 80 : 70},
  "questions": [
    {
      "question_text": "Clear, unambiguous question text",
      "question_type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answers": ["Option A"],
      "explanation": "Why this is correct",
      "points": 1
    }
  ]
}

Rules:
- MCQ questions must have exactly 4 options
- true_false questions must have options: ["True", "False"]
- correct_answers must be an array containing the exact text of correct option(s)
- Make questions test real understanding, not just memorization
- Vary difficulty within the set`;

    const quiz = await callAI(prompt, '', true);
    res.json({ success: true, quiz });

  } catch (err) {
    console.error('[AI generateQuiz]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/generate-certificate-text
// Body: { user_name, course_title, completion_date, org_name }
// ─────────────────────────────────────────────────────────────────────────────
const generateCertificateText = async (req, res) => {
  try {
    const {
      user_name, course_title,
      completion_date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      org_name = 'LearnPro',
      achievement_description = '',
    } = req.body;

    if (!user_name || !course_title) {
      return res.status(400).json({ error: 'user_name and course_title required' });
    }

    const prompt = `
Write professional certificate text for a learning achievement.

Recipient: ${user_name}
Course: ${course_title}
Organization: ${org_name}
Completion Date: ${completion_date}
${achievement_description ? `Achievement Notes: ${achievement_description}` : ''}

Return ONLY a JSON object:
{
  "headline": "Certificate of Completion",
  "presented_to_text": "This is to certify that",
  "achievement_text": "has successfully completed the course",
  "commendation": "One sentence of personalized commendation acknowledging specific skills gained",
  "skills_gained": ["skill 1", "skill 2", "skill 3"],
  "signatory_title": "Certified by",
  "footer_text": "This certificate validates the successful completion of all course requirements"
}`;

    const certText = await callAI(prompt, '', true);
    res.json({ success: true, certificate_text: certText });

  } catch (err) {
    console.error('[AI generateCertificateText]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/improve-content
// Body: { content, improvement_type }
// ─────────────────────────────────────────────────────────────────────────────
const improveContent = async (req, res) => {
  try {
    const { content, improvement_type = 'clarity', target_level = 'intermediate' } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const instructions = {
      clarity:    'Rewrite to be clearer, more concise, and easier to understand',
      expand:     'Expand with more detail, examples, and practical applications',
      simplify:   'Simplify for beginners — use plain language, avoid jargon',
      engaging:   'Make more engaging and interesting with stories, analogies, and real-world examples',
      structured: 'Restructure with clear headings, bullet points, and a logical flow',
    };

    const prompt = `${instructions[improvement_type] || instructions.clarity}. 
Target audience level: ${target_level}.

Original content:
${content}

Return ONLY the improved content text, no JSON, no explanation.`;

    const improved = await callAI(prompt);
    res.json({ success: true, improved_content: improved });

  } catch (err) {
    console.error('[AI improveContent]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/chat
// Body: { message, context, history }
// AI assistant for learners
// ─────────────────────────────────────────────────────────────────────────────
const chat = async (req, res) => {
  try {
    const { message, context = '', history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const historyText = history.slice(-6).map(h =>
      `${h.role === 'user' ? 'Learner' : 'Assistant'}: ${h.content}`
    ).join('\n');

    const prompt = `${context ? `Course Context: ${context}\n\n` : ''}${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}Learner: ${message}

Respond as a helpful, encouraging learning assistant. Be concise (2-4 sentences unless a detailed explanation is needed). If asked about the course content, refer to the context provided.`;

    const reply = await callAI(prompt, 'You are a helpful, encouraging AI learning assistant embedded in an LMS platform. Help learners understand course material, answer questions, and stay motivated.');
    res.json({ success: true, reply });

  } catch (err) {
    console.error('[AI chat]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /ai/status
// Check which AI provider is configured
// ─────────────────────────────────────────────────────────────────────────────
const getAIStatus = async (req, res) => {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI    = !!process.env.OPENAI_API_KEY;

  res.json({
    configured: hasAnthropic || hasOpenAI,
    provider:   hasAnthropic ? 'claude' : hasOpenAI ? 'openai' : 'none',
    model:      hasAnthropic ? 'claude-3-5-sonnet-20241022' : hasOpenAI ? 'gpt-4o' : null,
    features:   ['course_generation', 'quiz_generation', 'certificate_text', 'content_improvement', 'chat'],
  });
};

module.exports = { generateCourse, generateQuiz, generateCertificateText, improveContent, chat, getAIStatus };
