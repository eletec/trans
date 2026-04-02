const express = require('express');
const { solve, HEURISTICS } = require('../algorithm/solver');

const router = express.Router();

// POST /api/calculate
router.post('/', (req, res) => {
  const { palettes, truck, heuristic, allowRotation, groupContiguous, maxTrucks } = req.body;

  if (!palettes || !Array.isArray(palettes) || palettes.length === 0) {
    return res.status(400).json({ error: 'Tableau palettes requis et non vide' });
  }
  if (!truck || !truck.length_cm || !truck.width_cm) {
    return res.status(400).json({ error: 'Configuration camion (length_cm, width_cm) requise' });
  }

  try {
    const result = solve({
      palettes,
      truck,
      heuristic: heuristic || 'auto',
      allowRotation: allowRotation !== false,
      groupContiguous: groupContiguous !== false,
      maxTrucks: maxTrucks || 10
    });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: 'Erreur de calcul: ' + err.message });
  }
});

// GET /api/calculate/heuristics
router.get('/heuristics', (req, res) => {
  res.json({ heuristics: ['auto', ...HEURISTICS] });
});

module.exports = router;
