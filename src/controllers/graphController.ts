import { Request, Response } from 'express';
import { pool } from '../db';

// Get the full skill graph (nodes and edges)
export const getSkillGraph = async (req: Request, res: Response) => {
  try {
    const nodesResult = await pool.query('SELECT * FROM skill_nodes');
    const edgesResult = await pool.query('SELECT * FROM skill_edges');

    res.json({
      nodes: nodesResult.rows,
      edges: edgesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching skill graph:', error);
    res.status(500).json({ error: 'Server error while fetching skill graph' });
  }
};

// Create a new skill node
export const createSkillNode = async (req: Request, res: Response) => {
  const { title, description, domain, ks_level } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO skill_nodes (title, description, domain, ks_level) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, domain, ks_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating skill node:', error);
    res.status(500).json({ error: 'Server error while creating skill node' });
  }
};

// Add an edge (prerequisite) between two nodes
export const addSkillEdge = async (req: Request, res: Response) => {
  const { parent_node_id, child_node_id } = req.body;

  try {
    await pool.query(
      'INSERT INTO skill_edges (parent_node_id, child_node_id) VALUES ($1, $2)',
      [parent_node_id, child_node_id]
    );
    res.status(201).json({ message: 'Skill edge added successfully' });
  } catch (error) {
    console.error('Error adding skill edge:', error);
    res.status(500).json({ error: 'Server error while adding skill edge' });
  }
};
