const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { db } = require('../database');
const { authMiddleware } = require('../auth');
const { analyzeChange } = require('../aiService');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/analyses - Run a new analysis
router.post(
  '/',
  [
    body('inputText')
      .trim()
      .notEmpty().withMessage('Please enter a change request to analyze.')
      .isLength({ min: 10 }).withMessage('Change request must be at least 10 characters.')
      .isLength({ max: 5000 }).withMessage('Change request must not exceed 5000 characters.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { inputText } = req.body;
    const userId = req.userId;

    try {
      // Run AI analysis
      const result = await analyzeChange(inputText);

      // Generate analysis ID and title
      const analysisId = uuidv4();
      const title = result.title || inputText.substring(0, 60).trim();
      const resultJson = JSON.stringify(result);
      const riskLevel = result.riskLevel || 'medium';

      // Save to database - keyed to this user
      await db('analyses').insert({
        id: analysisId,
        user_id: userId,
        title,
        input_text: inputText,
        result: resultJson,
        risk_level: riskLevel,
      });

      res.status(201).json({
        id: analysisId,
        title,
        inputText,
        result,
        riskLevel,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Analysis error:', err);
      res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }
  }
);

// GET /api/analyses - Get user's analysis history
router.get('/', async (req, res) => {
  const userId = req.userId;

  try {
    const analyses = await db('analyses')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(100)
      .select('id', 'title', 'input_text', 'risk_level', 'created_at');

    res.json({ analyses });
  } catch (err) {
    console.error('Get analyses error:', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// GET /api/analyses/:id - Get a specific analysis
router.get('/:id', async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const analysis = await db('analyses')
      .where({ id, user_id: userId })
      .first();

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }

    // Parse the stored JSON result
    const result = JSON.parse(analysis.result);

    res.json({
      id: analysis.id,
      title: analysis.title,
      inputText: analysis.input_text,
      result,
      riskLevel: analysis.risk_level,
      createdAt: analysis.created_at,
    });
  } catch (err) {
    console.error('Get analysis error:', err);
    res.status(500).json({ error: 'Failed to fetch analysis.' });
  }
});

// DELETE /api/analyses/:id - Delete a specific analysis
router.delete('/:id', async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    // Only delete if owned by this user
    const deleted = await db('analyses')
      .where({ id, user_id: userId })
      .delete();

    if (!deleted) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }

    res.json({ message: 'Analysis deleted successfully.' });
  } catch (err) {
    console.error('Delete analysis error:', err);
    res.status(500).json({ error: 'Failed to delete analysis.' });
  }
});

// DELETE /api/analyses - Clear all user history
router.delete('/', async (req, res) => {
  const userId = req.userId;

  try {
    const deleted = await db('analyses').where({ user_id: userId }).delete();
    res.json({ message: `Cleared ${deleted} analyses from history.` });
  } catch (err) {
    console.error('Clear history error:', err);
    res.status(500).json({ error: 'Failed to clear history.' });
  }
});

module.exports = router;
