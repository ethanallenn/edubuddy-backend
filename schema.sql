-- Edubuddy "STEM Forge" Database Schema

-- Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('student', 'teacher', 'admin')) NOT NULL,
    region VARCHAR(10) CHECK (region IN ('ENG', 'WAL', 'SCO', 'NI', 'OTHER')) DEFAULT 'ENG',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization: Schools & Cohorts
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(10) CHECK (region IN ('ENG', 'WAL', 'SCO', 'NI', 'OTHER')) DEFAULT 'ENG',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    year_group_uk INTEGER, -- e.g., 7, 8, 9
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cohort_members (
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (cohort_id, student_id)
);

-- The Knowledge Graph (Curriculum)
CREATE TABLE skill_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(100) NOT NULL, -- e.g., 'Computer Science', 'Physics'
    ks_level VARCHAR(10), -- e.g., 'KS3', 'KS4' (For subtle UK alignment)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_edges (
    parent_node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
    child_node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_node_id, child_node_id)
);

-- Learning Environments (Workshops)
CREATE TABLE workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workshop_nodes (
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
    PRIMARY KEY (workshop_id, node_id)
);

CREATE TABLE workshop_enrollments (
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (workshop_id, student_id)
);

-- Interactive Assignments (Challenges & Forges)
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
    forge_type VARCHAR(50) CHECK (forge_type IN ('code', 'logic', 'data')) NOT NULL,
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    initial_state JSONB, -- The starting code/workspace
    validation_logic JSONB, -- How to check if it's correct (e.g., expected output)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Progress & State
CREATE TABLE student_mastery (
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('locked', 'unlocked', 'in_progress', 'mastered')) DEFAULT 'locked',
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, node_id)
);

CREATE TABLE forge_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    current_state JSONB, -- The student's current code/workspace
    is_completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for Graph Traversal and Fast Lookups
CREATE INDEX idx_skill_edges_child ON skill_edges(child_node_id);
CREATE INDEX idx_student_mastery_status ON student_mastery(student_id, status);
CREATE INDEX idx_forge_sessions_student_challenge ON forge_sessions(student_id, challenge_id);
