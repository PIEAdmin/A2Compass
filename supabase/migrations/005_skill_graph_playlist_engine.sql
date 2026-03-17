-- ============================================================
-- A² Compass — Phase 2 Week 5: Skill Graph & Playlist Engine
-- Migration 005
-- ============================================================
-- This migration creates:
--   1. skill_domains       — 10 assessment domains (A–J)
--   2. skill_nodes         — 94 individual skills with prerequisites
--   3. skill_prerequisites — prerequisite links (within & cross-domain)
--   4. student_skill_profiles — per-student mastery status per skill
--   5. playlist_config     — per-student playlist settings
--   6. playlist_items      — auto-generated daily playlist entries
--   7. Functions & triggers for the adaptive playlist engine
-- ============================================================

-- ============================================================
-- 1. SKILL DOMAINS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.skill_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(1) NOT NULL UNIQUE,                  -- A, B, C, ... J
  name TEXT NOT NULL,                             -- e.g. "Print Concepts"
  category TEXT NOT NULL CHECK (category IN ('literacy', 'numeracy')),
  subject_id UUID REFERENCES public.subjects(id), -- maps to ELA or Math
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  skill_count INT NOT NULL DEFAULT 0,             -- denormalized for quick access
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 10 domains
INSERT INTO public.skill_domains (code, name, category, description, display_order, skill_count)
VALUES
  ('A', 'Print Concepts',             'literacy',  'Understanding what a book is and how print works',              1,  6),
  ('B', 'Letter Recognition',         'literacy',  'From name awareness to full alphabet mastery',                  2,  8),
  ('C', 'Phonological Awareness',     'literacy',  'Hearing and manipulating sounds in language',                   3, 11),
  ('D', 'Phonics',                    'literacy',  'Connecting letters to sounds — the bridge to reading',          4, 11),
  ('E', 'High-Frequency Words',       'literacy',  'Sight words that must be recognized instantly',                 5,  6),
  ('F', 'Vocabulary & Comprehension', 'literacy',  'From listening comprehension to critical reading',              6,  7),
  ('G', 'Counting & Cardinality',     'numeracy',  'From verbal counting to understanding number relationships',    7, 12),
  ('H', 'Number Operations',          'numeracy',  'From joining groups to division — core math fluency',           8, 15),
  ('I', 'Geometry & Spatial Sense',   'numeracy',  'Understanding shapes, space, and spatial relationships',        9,  7),
  ('J', 'Measurement & Data',         'numeracy',  'From "which is bigger?" to reading graphs',                    10, 11);

-- Link domains to subjects (ELA and Math)
-- We'll do this after the insert so we can reference both tables
UPDATE public.skill_domains SET subject_id = (SELECT id FROM public.subjects WHERE slug = 'english-language-arts')
WHERE category = 'literacy';
UPDATE public.skill_domains SET subject_id = (SELECT id FROM public.subjects WHERE slug = 'mathematics')
WHERE category = 'numeracy';


-- ============================================================
-- 2. SKILL NODES (94 skills)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.skill_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.skill_domains(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,                       -- A1, B2b, G11, etc.
  name TEXT NOT NULL,                              -- "Uppercase Letter Recognition (Random Order)"
  description TEXT,                                -- Detailed description / mastery criteria
  grade_band TEXT NOT NULL,                        -- "Pre-K", "K", "K/1st", "1st", "2nd", "3rd+"
  grade_level_approx INT NOT NULL DEFAULT 0,       -- Numeric approximation: Pre-K=0, K=1, 1st=2, 2nd=3, etc.
  display_order INT NOT NULL DEFAULT 0,            -- Order within domain
  is_entry_point BOOLEAN NOT NULL DEFAULT false,   -- No prerequisites — where assessment starts
  mastery_threshold NUMERIC(5,2) NOT NULL DEFAULT 85.00,
  sample_activities JSONB DEFAULT '[]'::jsonb,     -- Array of activity descriptions
  mastery_criteria TEXT,                           -- What 85% looks like for this skill
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_nodes_domain ON public.skill_nodes(domain_id);
CREATE INDEX idx_skill_nodes_code ON public.skill_nodes(code);
CREATE INDEX idx_skill_nodes_grade ON public.skill_nodes(grade_level_approx);

-- ============================================================
-- Seed all 94 skills
-- ============================================================

-- Domain A: Print Concepts (6 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='A'), 'A1', 'Book Orientation', 'Holds book right-side up, identifies front/back cover', 'Pre-K', 0, 1, true, 'Correctly orients book and identifies front/back cover in 5/5 trials'),
((SELECT id FROM skill_domains WHERE code='A'), 'A2', 'Print Direction', 'Tracks left-to-right, top-to-bottom on a page', 'Pre-K', 0, 2, false, 'Correctly traces reading direction in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='A'), 'A3', 'Word vs. Letter Distinction', 'Points to a "word" vs. a "letter" on a page', 'Pre-K/K', 1, 3, false, 'Correctly distinguishes words and letters in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='A'), 'A4', 'Word Boundaries (Spaces)', 'Identifies spaces between words; counts words in a short sentence', 'K', 1, 4, false, 'Counts words accurately in 4/5 sentences'),
((SELECT id FROM skill_domains WHERE code='A'), 'A5', 'Sentence Concepts', 'Identifies capital letters at start, period at end; understands sentence as complete thought', 'K/1st', 2, 5, false, 'Identifies sentence features in 4/5 examples'),
((SELECT id FROM skill_domains WHERE code='A'), 'A6', 'Text Features', 'Identifies title, author, page numbers, illustrations vs. text', '1st/2nd', 3, 6, false, 'Correctly identifies 4/5 text features');

-- Domain B: Letter Recognition (8 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='B'), 'B1', 'Letters in Own Name', 'Recognizes and names the letters in their first name', 'Pre-K', 0, 1, true, 'Names all letters in first name correctly'),
((SELECT id FROM skill_domains WHERE code='B'), 'B2', 'Uppercase Letter Recognition (Sequential)', 'Recites and identifies uppercase letters in alphabetical order', 'Pre-K/K', 1, 2, false, 'Names 22/26 uppercase letters in sequence'),
((SELECT id FROM skill_domains WHERE code='B'), 'B2b', 'Uppercase Letter Recognition (Random Order)', 'Identifies all 26 uppercase letters by name when shown in random order', 'Pre-K/K', 1, 3, false, 'Names 22/26 uppercase letters shown randomly'),
((SELECT id FROM skill_domains WHERE code='B'), 'B3', 'Lowercase Letter Recognition (Sequential)', 'Recites and identifies lowercase letters in alphabetical order', 'K', 1, 4, false, 'Names 22/26 lowercase letters in sequence'),
((SELECT id FROM skill_domains WHERE code='B'), 'B3b', 'Lowercase Letter Recognition (Random Order)', 'Identifies all 26 lowercase letters by name when shown in random order', 'K', 1, 5, false, 'Names 22/26 lowercase letters shown randomly'),
((SELECT id FROM skill_domains WHERE code='B'), 'B4', 'Upper/Lowercase Matching', 'Matches uppercase to corresponding lowercase (Aa, Bb, etc.)', 'K', 1, 6, false, 'Correctly matches 22/26 letter pairs'),
((SELECT id FROM skill_domains WHERE code='B'), 'B5', 'Alphabetical Order', 'Arranges letters in sequence; identifies what comes before/after', 'K/1st', 2, 7, false, 'Correctly sequences and identifies neighbors in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='B'), 'B6', 'Letter Formation (Writing)', 'Correctly forms both upper and lowercase letters', 'K/1st', 2, 8, false, 'Teacher-assessed: forms letters legibly with correct strokes');

-- Domain C: Phonological Awareness (11 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='C'), 'C1',  'Environmental Sound Recognition', 'Identifies common sounds (doorbell, dog bark, phone ring)', 'Pre-K', 0, 1, true, 'Identifies 4/5 environmental sounds correctly'),
((SELECT id FROM skill_domains WHERE code='C'), 'C2',  'Rhyme Recognition', 'Identifies whether two words rhyme', 'Pre-K', 0, 2, false, 'Correctly identifies rhyming pairs in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='C'), 'C3',  'Rhyme Production', 'Produces a word that rhymes with a given word', 'Pre-K/K', 1, 3, false, 'Produces a rhyming word for 4/5 prompts'),
((SELECT id FROM skill_domains WHERE code='C'), 'C4',  'Syllable Counting', 'Claps/counts syllables in spoken words', 'Pre-K/K', 1, 4, false, 'Correctly counts syllables in 4/5 words'),
((SELECT id FROM skill_domains WHERE code='C'), 'C5',  'Syllable Blending', 'Blends spoken syllables into a word', 'K', 1, 5, false, 'Blends syllables into correct word in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='C'), 'C6',  'Onset-Rime Recognition', 'Separates initial sound from word ending (c-at, b-at)', 'K', 1, 6, false, 'Correctly separates onset and rime in 4/5 words'),
((SELECT id FROM skill_domains WHERE code='C'), 'C7',  'Initial Sound Isolation', 'Identifies the first sound in a word', 'K', 1, 7, false, 'Correctly isolates initial sound in 4/5 words'),
((SELECT id FROM skill_domains WHERE code='C'), 'C8',  'Final Sound Isolation', 'Identifies the last sound in a word', 'K/1st', 2, 8, false, 'Correctly isolates final sound in 4/5 words'),
((SELECT id FROM skill_domains WHERE code='C'), 'C9',  'Phoneme Blending', 'Blends individual sounds into a word (/c/ /a/ /t/ = cat)', 'K/1st', 2, 9, false, 'Blends 3-4 phonemes into correct word in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='C'), 'C10', 'Phoneme Segmenting', 'Breaks a word into individual sounds', '1st', 2, 10, false, 'Segments 3-4 phoneme words correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='C'), 'C11', 'Phoneme Manipulation', 'Substitutes, deletes, or adds sounds in words', '1st/2nd', 3, 11, false, 'Correctly manipulates phonemes in 4/5 trials');

-- Domain D: Phonics (11 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='D'), 'D1',  'Letter-Sound Correspondence (common consonants)', 'Produces the sound for common consonants (b, d, f, m, n, p, s, t)', 'K', 1, 1, false, 'Produces correct sounds for 7/8 common consonants'),
((SELECT id FROM skill_domains WHERE code='D'), 'D2',  'Letter-Sound Correspondence (all consonants)', 'Produces sounds for all 21 consonants', 'K', 1, 2, false, 'Produces correct sounds for 18/21 consonants'),
((SELECT id FROM skill_domains WHERE code='D'), 'D3',  'Short Vowel Sounds', 'Identifies and produces short vowel sounds (a, e, i, o, u)', 'K', 1, 3, false, 'Produces correct short vowel sounds for 4/5 vowels'),
((SELECT id FROM skill_domains WHERE code='D'), 'D4',  'CVC Word Reading', 'Reads consonant-vowel-consonant words (cat, big, hot)', 'K/1st', 2, 4, false, 'Reads 4/5 CVC words correctly'),
((SELECT id FROM skill_domains WHERE code='D'), 'D5',  'Consonant Digraphs', 'Reads ch, sh, th, wh, ck combinations', '1st', 2, 5, false, 'Reads words with digraphs correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='D'), 'D6',  'Consonant Blends', 'Reads bl, br, cl, cr, dr, fl, fr, gr, pl, pr, sl, sm, sn, sp, st, tr', '1st', 2, 6, false, 'Reads words with blends correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='D'), 'D7',  'Long Vowel Patterns (CVCe)', 'Reads silent-e words (cake, bike, rope, cute)', '1st', 2, 7, false, 'Reads 4/5 CVCe words correctly'),
((SELECT id FROM skill_domains WHERE code='D'), 'D8',  'Vowel Teams', 'Reads ai, ay, ea, ee, ie, oa, oe, ue, oo patterns', '1st/2nd', 3, 8, false, 'Reads vowel team words correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='D'), 'D9',  'R-Controlled Vowels', 'Reads ar, er, ir, or, ur patterns', '2nd', 3, 9, false, 'Reads r-controlled words correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='D'), 'D10', 'Diphthongs & Complex Vowels', 'Reads oi, oy, ou, ow, au, aw patterns', '2nd/3rd', 4, 10, false, 'Reads diphthong words correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='D'), 'D11', 'Multisyllabic Word Decoding', 'Applies syllable division rules to decode longer words', '3rd+', 4, 11, false, 'Decodes 4/5 multisyllabic words correctly');

-- Domain E: High-Frequency Words (6 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='E'), 'E1', 'Pre-Primer Sight Words (20 words)', 'Reads: a, and, away, big, blue, can, come, down, find, for, funny, go, help, here, I, in, is, it, jump, little', 'Pre-K/K', 1, 1, false, 'Reads 17/20 words correctly'),
((SELECT id FROM skill_domains WHERE code='E'), 'E2', 'Primer Sight Words (26 words)', 'Reads: all, am, are, at, ate, be, black, brown, but, came, did, do, eat, four, get, good, have, he, into, like, must, new, no, now, on, our', 'K', 1, 2, false, 'Reads 22/26 words correctly'),
((SELECT id FROM skill_domains WHERE code='E'), 'E3', 'First Grade Sight Words Set A (20 words)', 'Reads: after, again, an, any, as, ask, by, could, every, fly, from, give, going, had, has, her, him, his, how, just', 'K/1st', 2, 3, false, 'Reads 17/20 words correctly'),
((SELECT id FROM skill_domains WHERE code='E'), 'E4', 'First Grade Sight Words Set B (21 words)', 'Reads: know, let, live, may, of, old, once, open, over, put, round, some, stop, take, thank, them, then, think, walk, were, when', '1st', 2, 4, false, 'Reads 18/21 words correctly'),
((SELECT id FROM skill_domains WHERE code='E'), 'E5', 'Second Grade Sight Words (23 words)', 'Reads: always, around, because, been, before, best, both, buy, call, cold, does, don''t, fast, first, five, found, gave, goes, green, its, made, many, off', '1st/2nd', 3, 5, false, 'Reads 20/23 words correctly'),
((SELECT id FROM skill_domains WHERE code='E'), 'E6', 'Third Grade+ Sight Words (25 words)', 'Reads: about, better, bring, carry, clean, cut, done, draw, drink, eight, fall, far, full, got, grow, hold, hot, hurt, if, keep, kind, laugh, light, long, much', '2nd/3rd', 4, 6, false, 'Reads 21/25 words correctly');

-- Domain F: Vocabulary & Comprehension (7 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='F'), 'F1', 'Listening Comprehension (Basic)', 'Answers simple who/what questions about a read-aloud story', 'Pre-K', 0, 1, true, 'Answers 4/5 who/what questions correctly'),
((SELECT id FROM skill_domains WHERE code='F'), 'F2', 'Listening Comprehension (Detailed)', 'Retells key events; answers where/when/why questions', 'Pre-K/K', 1, 2, false, 'Retells 3+ events and answers 4/5 questions'),
((SELECT id FROM skill_domains WHERE code='F'), 'F3', 'Vocabulary: Everyday Objects & Actions', 'Names and describes common objects, actions, and feelings', 'K', 1, 3, true, 'Names/describes 4/5 items correctly'),
((SELECT id FROM skill_domains WHERE code='F'), 'F4', 'Vocabulary: Categories & Relationships', 'Sorts words into categories; identifies synonyms/antonyms', 'K/1st', 2, 4, false, 'Correctly sorts/identifies in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='F'), 'F5', 'Reading Comprehension (Literal)', 'Reads a short passage and answers explicit who/what/where questions', '1st', 2, 5, false, 'Answers 4/5 literal comprehension questions correctly'),
((SELECT id FROM skill_domains WHERE code='F'), 'F6', 'Reading Comprehension (Inferential)', 'Makes inferences; predicts outcomes; identifies main idea', '2nd', 3, 6, false, 'Correctly answers 4/5 inferential questions'),
((SELECT id FROM skill_domains WHERE code='F'), 'F7', 'Critical Comprehension', 'Evaluates author''s purpose; compares texts; fact vs. opinion', '3rd+', 4, 7, false, 'Correctly evaluates 4/5 critical questions');

-- Domain G: Counting & Cardinality (12 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='G'), 'G1',  'Verbal Counting 1-10', 'Counts aloud from 1 to 10 in sequence', 'Pre-K', 0, 1, true, 'Counts 1-10 correctly without prompts'),
((SELECT id FROM skill_domains WHERE code='G'), 'G2',  'One-to-One Correspondence (1-10)', 'Counts objects, touching each one once, up to 10', 'Pre-K', 0, 2, false, 'Correctly counts 4/5 object sets'),
((SELECT id FROM skill_domains WHERE code='G'), 'G3',  'Number Recognition 0-10', 'Identifies written numerals 0 through 10', 'Pre-K', 0, 3, false, 'Identifies 9/11 numerals correctly'),
((SELECT id FROM skill_domains WHERE code='G'), 'G4',  'Quantity-Numeral Matching (1-10)', 'Matches a group of objects to the correct numeral', 'Pre-K/K', 1, 4, false, 'Matches 4/5 groups to correct numeral'),
((SELECT id FROM skill_domains WHERE code='G'), 'G5',  'Verbal Counting 1-20', 'Counts aloud from 1 to 20 (and backward from 10)', 'K', 1, 5, false, 'Counts 1-20 and backward 10-1 correctly'),
((SELECT id FROM skill_domains WHERE code='G'), 'G6',  'Number Recognition 0-20', 'Identifies written numerals 0 through 20', 'K', 1, 6, false, 'Identifies 18/21 numerals correctly'),
((SELECT id FROM skill_domains WHERE code='G'), 'G7',  'Comparing Numbers (more/less/equal)', 'Compares two groups or numbers: "Which is more?"', 'K', 1, 7, false, 'Correctly compares in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='G'), 'G8',  'Verbal Counting to 100', 'Counts from 1 to 100; counts by 10s', 'K/1st', 2, 8, false, 'Counts to 100 and by 10s correctly'),
((SELECT id FROM skill_domains WHERE code='G'), 'G9',  'Number Recognition 20-100', 'Identifies written numerals 20 through 100', '1st', 2, 9, false, 'Identifies numerals correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='G'), 'G10', 'Ordinal Numbers (1st-10th)', 'Identifies position using ordinal numbers', '1st', 2, 10, false, 'Correctly identifies ordinal positions in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='G'), 'G11', 'Number Writing (0-20)', 'Writes numerals 0-20 from memory', 'K/1st', 2, 11, false, 'Writes 17/20 numerals legibly from dictation'),
((SELECT id FROM skill_domains WHERE code='G'), 'G12', 'Number Writing (to 100)', 'Writes any numeral 0-100 from dictation', '1st/2nd', 3, 12, false, 'Writes 4/5 dictated numerals correctly');

-- Domain H: Number Operations (15 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='H'), 'H1',  'Joining Groups (Pre-Addition)', 'Combines two groups and counts the total (with objects)', 'Pre-K/K', 1, 1, false, 'Correctly combines and counts 4/5 group pairs'),
((SELECT id FROM skill_domains WHERE code='H'), 'H2',  'Addition Within 5', 'Solves addition problems where sum ≤ 5', 'K', 1, 2, false, 'Solves 4/5 addition problems within 5 correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H3',  'Separating Groups (Pre-Subtraction)', 'Removes objects from a group and counts what remains', 'K', 1, 3, false, 'Correctly separates and counts 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='H'), 'H4',  'Subtraction Within 5', 'Solves subtraction problems within 5', 'K', 1, 4, false, 'Solves 4/5 subtraction problems within 5 correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H5',  'Addition Within 10', 'Solves addition problems where sum ≤ 10', 'K/1st', 2, 5, false, 'Solves 4/5 addition problems within 10 correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H6',  'Subtraction Within 10', 'Solves subtraction problems within 10', '1st', 2, 6, false, 'Solves 4/5 subtraction problems within 10 correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H7',  'Addition Within 20', 'Solves addition problems where sum ≤ 20 (with and without regrouping)', '1st', 2, 7, false, 'Solves 4/5 addition problems within 20 correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H8',  'Subtraction Within 20', 'Solves subtraction problems within 20', '1st', 2, 8, false, 'Solves 4/5 subtraction problems within 20 correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H9',  'Place Value (Tens & Ones)', 'Understands that 34 = 3 tens + 4 ones', '1st', 2, 9, false, 'Correctly decomposes 4/5 numbers into tens and ones'),
((SELECT id FROM skill_domains WHERE code='H'), 'H10', 'Addition/Subtraction Within 100', 'Two-digit addition/subtraction with regrouping', '2nd', 3, 10, false, 'Solves 4/5 two-digit problems correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H11', 'Multiplication Concepts', 'Understands multiplication as repeated addition; uses arrays', '2nd/3rd', 4, 11, false, 'Correctly models multiplication in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='H'), 'H12', 'Multiplication Facts (0-10)', 'Recalls multiplication facts through 10×10', '3rd', 4, 12, false, 'Recalls 85%+ of facts within time limit'),
((SELECT id FROM skill_domains WHERE code='H'), 'H13', 'Division Concepts', 'Understands division as equal sharing/grouping', '3rd', 4, 13, false, 'Correctly models division in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='H'), 'H14', 'Word Problems (Addition & Subtraction)', 'Solves real-world story problems requiring add/subtract within 20', '1st/2nd', 3, 14, false, 'Reads and solves 4/5 word problems correctly'),
((SELECT id FROM skill_domains WHERE code='H'), 'H15', 'Word Problems (Multiplication & Division)', 'Solves multi-step word problems with multiplication and division', '3rd/4th', 5, 15, false, 'Reads and solves 4/5 multi-step problems correctly');

-- Domain I: Geometry & Spatial Sense (7 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='I'), 'I1', 'Basic Shape Recognition (2D)', 'Identifies circle, square, triangle, rectangle', 'Pre-K', 0, 1, true, 'Identifies 4/4 basic shapes correctly'),
((SELECT id FROM skill_domains WHERE code='I'), 'I2', 'Shape Attributes', 'Describes shapes by number of sides/corners', 'Pre-K/K', 1, 2, false, 'Correctly describes attributes of 4/5 shapes'),
((SELECT id FROM skill_domains WHERE code='I'), 'I3', 'Positional Words', 'Understands above/below, beside/between, in front/behind', 'Pre-K/K', 1, 3, true, 'Correctly responds to 4/5 positional prompts'),
((SELECT id FROM skill_domains WHERE code='I'), 'I4', 'Shape Composition', 'Combines shapes to make new shapes', 'K/1st', 2, 4, false, 'Correctly composes shapes in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='I'), 'I5', '3D Shape Recognition', 'Identifies sphere, cube, cone, cylinder', 'K/1st', 2, 5, false, 'Identifies 4/4 3D shapes and names real-world examples'),
((SELECT id FROM skill_domains WHERE code='I'), 'I6', 'Symmetry', 'Identifies lines of symmetry; completes symmetrical figures', '1st/2nd', 3, 6, false, 'Correctly identifies/completes symmetry in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='I'), 'I7', 'Congruence & Transformations', 'Identifies congruent shapes; understands slides, flips, turns', '2nd/3rd', 4, 7, false, 'Correctly identifies transformations in 4/5 trials');

-- Domain J: Measurement & Data (11 skills)
INSERT INTO public.skill_nodes (domain_id, code, name, description, grade_band, grade_level_approx, display_order, is_entry_point, mastery_criteria) VALUES
((SELECT id FROM skill_domains WHERE code='J'), 'J1',  'Size Comparison (big/small, long/short)', 'Compares two objects by size, length, height', 'Pre-K', 0, 1, true, 'Correctly compares in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='J'), 'J2',  'Ordering by Size', 'Arranges 3+ objects from smallest to largest', 'Pre-K/K', 1, 2, false, 'Correctly orders 4/5 sets'),
((SELECT id FROM skill_domains WHERE code='J'), 'J3',  'Non-Standard Measurement', 'Measures objects using non-standard units (paper clips, blocks)', 'K', 1, 3, false, 'Measures within 1 unit accuracy in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='J'), 'J4',  'Weight & Capacity Concepts', 'Understands heavy/light, full/empty; compares by weight', 'K/1st', 2, 4, false, 'Correctly compares in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='J'), 'J5',  'Time: Days & Sequence', 'Names days of the week; understands yesterday/today/tomorrow', 'K', 1, 5, true, 'Names all 7 days in order and uses sequence words correctly'),
((SELECT id FROM skill_domains WHERE code='J'), 'J6',  'Time: Clock Reading (Hour/Half Hour)', 'Reads analog and digital clocks to the hour and half hour', '1st', 2, 6, false, 'Reads 4/5 clock times correctly'),
((SELECT id FROM skill_domains WHERE code='J'), 'J7',  'Time: Clock Reading (5 Minutes)', 'Reads clocks to 5-minute intervals; understands elapsed time', '2nd', 3, 7, false, 'Reads 4/5 clock times to 5 minutes correctly'),
((SELECT id FROM skill_domains WHERE code='J'), 'J8',  'Standard Measurement (Inches/Centimeters)', 'Measures length using rulers', '1st/2nd', 3, 8, false, 'Measures within 0.5 unit accuracy in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='J'), 'J9',  'Money: Coin Identification', 'Identifies penny, nickel, dime, quarter and their values', 'K/1st', 2, 9, false, 'Identifies all 4 coins and their values'),
((SELECT id FROM skill_domains WHERE code='J'), 'J10', 'Money: Counting Coins', 'Counts mixed coins to find total value', '1st/2nd', 3, 10, false, 'Counts mixed coins correctly in 4/5 trials'),
((SELECT id FROM skill_domains WHERE code='J'), 'J11', 'Data & Graphs', 'Reads and creates simple bar graphs, picture graphs, tally charts', '1st/2nd', 3, 11, false, 'Correctly reads/creates graphs in 4/5 trials');


-- ============================================================
-- 3. SKILL PREREQUISITES (all prerequisite links)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.skill_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
  is_cross_domain BOOLEAN NOT NULL DEFAULT false,  -- ⚡ cross-domain gates
  rationale TEXT,                                    -- Why this prerequisite exists
  UNIQUE(skill_id, prerequisite_id)
);

CREATE INDEX idx_prereqs_skill ON public.skill_prerequisites(skill_id);
CREATE INDEX idx_prereqs_prerequisite ON public.skill_prerequisites(prerequisite_id);

-- Helper function to get skill_node id by code
CREATE OR REPLACE FUNCTION public.sk(p_code TEXT) RETURNS UUID AS $$
  SELECT id FROM public.skill_nodes WHERE code = p_code;
$$ LANGUAGE sql STABLE;

-- ----------------------------------------
-- Domain A prerequisites (linear chain)
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('A2'), sk('A1'), false, 'Must understand book orientation before tracking print direction'),
(sk('A3'), sk('A2'), false, 'Must track print direction before distinguishing words vs letters'),
(sk('A4'), sk('A3'), false, 'Must distinguish words before identifying word boundaries'),
(sk('A5'), sk('A4'), false, 'Must understand word boundaries before sentence concepts'),
(sk('A6'), sk('A5'), false, 'Must understand sentences before identifying text features');

-- ----------------------------------------
-- Domain B prerequisites
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('B2'),  sk('B1'),  false, 'Must recognize name letters before full alphabet'),
(sk('B2b'), sk('B2'),  false, 'Must know sequential uppercase before random identification'),
(sk('B3'),  sk('B2b'), false, 'Must recognize uppercase randomly before starting lowercase'),
(sk('B3b'), sk('B3'),  false, 'Must know sequential lowercase before random identification'),
(sk('B4'),  sk('B2b'), false, 'Must recognize uppercase randomly to match pairs'),
(sk('B4'),  sk('B3b'), false, 'Must recognize lowercase randomly to match pairs'),
(sk('B5'),  sk('B4'),  false, 'Must match pairs before alphabetical ordering'),
(sk('B6'),  sk('B4'),  false, 'Must match pairs before letter formation');

-- ----------------------------------------
-- Domain C prerequisites (branching)
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('C2'),  sk('C1'),  false, 'Must recognize sounds before rhyme recognition'),
(sk('C3'),  sk('C2'),  false, 'Must recognize rhymes before producing them'),
(sk('C4'),  sk('C1'),  false, 'Must recognize sounds before counting syllables'),
(sk('C5'),  sk('C4'),  false, 'Must count syllables before blending them'),
(sk('C6'),  sk('C2'),  false, 'Rhyme recognition supports onset-rime separation'),
(sk('C6'),  sk('C4'),  false, 'Syllable awareness supports onset-rime separation'),
(sk('C7'),  sk('C6'),  false, 'Must separate onset-rime before isolating initial sounds'),
(sk('C8'),  sk('C7'),  false, 'Must isolate initial sounds before final sounds'),
(sk('C9'),  sk('C7'),  false, 'Must isolate sounds before blending phonemes'),
(sk('C10'), sk('C9'),  false, 'Must blend phonemes before segmenting them'),
(sk('C11'), sk('C10'), false, 'Must segment phonemes before manipulating them');

-- ----------------------------------------
-- Domain D prerequisites (with cross-domain ⚡)
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('D1'),  sk('B2b'), true,  'Must recognize uppercase letters randomly before learning letter sounds'),
(sk('D1'),  sk('C7'),  true,  'Must isolate initial sounds before mapping them to letters'),
(sk('D2'),  sk('D1'),  false, 'Must know common consonant sounds before all consonants'),
(sk('D3'),  sk('D1'),  false, 'Must know consonant sounds before short vowel sounds'),
(sk('D3'),  sk('B3b'), true,  'Must recognize lowercase letters for vowel identification'),
(sk('D4'),  sk('D2'),  false, 'Must know all consonant sounds for CVC reading'),
(sk('D4'),  sk('D3'),  false, 'Must know short vowels for CVC reading'),
(sk('D4'),  sk('C9'),  true,  'Must blend phonemes orally before blending in print'),
(sk('D5'),  sk('D4'),  false, 'Must read CVC words before consonant digraphs'),
(sk('D6'),  sk('D4'),  false, 'Must read CVC words before consonant blends'),
(sk('D7'),  sk('D4'),  false, 'Must read CVC words before long vowel patterns'),
(sk('D8'),  sk('D7'),  false, 'Must understand CVCe before vowel teams'),
(sk('D9'),  sk('D7'),  false, 'Must understand CVCe before r-controlled vowels'),
(sk('D10'), sk('D8'),  false, 'Must read vowel teams before complex vowels'),
(sk('D10'), sk('D9'),  false, 'Must read r-controlled vowels before complex vowels'),
(sk('D11'), sk('D10'), false, 'Must handle complex vowels before multisyllabic decoding');

-- ----------------------------------------
-- Domain E prerequisites (with cross-domain ⚡)
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('E1'), sk('B2b'), true,  'Must recognize letters before recognizing whole words'),
(sk('E2'), sk('E1'),  false, 'Must know pre-primer words before primer words'),
(sk('E2'), sk('D1'),  true,  'Beginning phonics supports word recognition'),
(sk('E3'), sk('E2'),  false, 'Must know primer words before first grade set A'),
(sk('E4'), sk('E3'),  false, 'Must know set A before set B'),
(sk('E5'), sk('E4'),  false, 'Must know first grade sets before second grade'),
(sk('E5'), sk('D7'),  true,  'Long vowel patterns support advanced sight words'),
(sk('E6'), sk('E5'),  false, 'Must know second grade words before third grade'),
(sk('E6'), sk('D8'),  true,  'Vowel teams support complex word recognition');

-- ----------------------------------------
-- Domain F prerequisites (with cross-domain ⚡)
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('F2'), sk('F1'),  false, 'Must comprehend basic questions before detailed retelling'),
(sk('F4'), sk('F3'),  false, 'Must know everyday vocabulary before categories/relationships'),
(sk('F5'), sk('F2'),  false, 'Must comprehend listened stories before reading passages'),
(sk('F5'), sk('D4'),  true,  'Must decode CVC words to read comprehension passages'),
(sk('F5'), sk('E3'),  true,  'Must know first grade sight words to read passages'),
(sk('F6'), sk('F5'),  false, 'Must comprehend literally before making inferences'),
(sk('F7'), sk('F6'),  false, 'Must make inferences before critical evaluation'),
(sk('F7'), sk('D11'), true,  'Must decode multisyllabic words for grade 3+ texts');

-- ----------------------------------------
-- Domain G prerequisites
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('G2'),  sk('G1'),  false, 'Must count verbally before one-to-one correspondence'),
(sk('G3'),  sk('G1'),  false, 'Must count verbally before recognizing written numerals'),
(sk('G4'),  sk('G2'),  false, 'Must count objects before matching to numerals'),
(sk('G4'),  sk('G3'),  false, 'Must recognize numerals before matching to quantities'),
(sk('G5'),  sk('G1'),  false, 'Must count to 10 before counting to 20'),
(sk('G6'),  sk('G3'),  false, 'Must recognize 0-10 before 0-20'),
(sk('G6'),  sk('G5'),  false, 'Must count to 20 before recognizing numerals to 20'),
(sk('G7'),  sk('G4'),  false, 'Must match quantities to numerals before comparing'),
(sk('G8'),  sk('G5'),  false, 'Must count to 20 before counting to 100'),
(sk('G9'),  sk('G6'),  false, 'Must recognize 0-20 before 20-100'),
(sk('G9'),  sk('G8'),  false, 'Must count to 100 before recognizing those numerals'),
(sk('G10'), sk('G7'),  false, 'Must compare numbers before understanding ordinal position'),
(sk('G11'), sk('G6'),  false, 'Must recognize numerals 0-20 before writing them'),
(sk('G12'), sk('G9'),  false, 'Must recognize numerals to 100 before writing them'),
(sk('G12'), sk('G11'), false, 'Must write 0-20 before writing to 100');

-- ----------------------------------------
-- Domain H prerequisites (with cross-domain ⚡)
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('H1'),  sk('G4'),  true,  'Must match quantity to numeral before combining groups'),
(sk('H2'),  sk('H1'),  false, 'Must join groups before formal addition'),
(sk('H3'),  sk('G4'),  true,  'Must match quantity to numeral before separating groups'),
(sk('H3'),  sk('H1'),  false, 'Must understand joining before separating'),
(sk('H4'),  sk('H3'),  false, 'Must separate groups before formal subtraction'),
(sk('H5'),  sk('H2'),  false, 'Must add within 5 before adding within 10'),
(sk('H5'),  sk('G6'),  true,  'Must recognize numerals 0-20 for sums above 5'),
(sk('H6'),  sk('H4'),  false, 'Must subtract within 5 before subtracting within 10'),
(sk('H6'),  sk('H5'),  false, 'Addition within 10 supports subtraction within 10'),
(sk('H7'),  sk('H5'),  false, 'Must add within 10 before adding within 20'),
(sk('H7'),  sk('G9'),  true,  'Must recognize numerals to 100 for sums above 10'),
(sk('H8'),  sk('H6'),  false, 'Must subtract within 10 before subtracting within 20'),
(sk('H8'),  sk('H7'),  false, 'Addition within 20 supports subtraction within 20'),
(sk('H9'),  sk('G8'),  true,  'Must count to 100 to understand place value'),
(sk('H9'),  sk('H7'),  false, 'Addition within 20 supports place value understanding'),
(sk('H10'), sk('H8'),  false, 'Must handle within 20 before within 100'),
(sk('H10'), sk('H9'),  false, 'Must understand place value for multi-digit operations'),
(sk('H11'), sk('H10'), false, 'Must add/subtract within 100 before multiplication'),
(sk('H12'), sk('H11'), false, 'Must understand multiplication concepts before memorizing facts'),
(sk('H13'), sk('H11'), false, 'Must understand multiplication before division'),
(sk('H14'), sk('H8'),  false, 'Must subtract within 20 for add/subtract word problems'),
(sk('H14'), sk('F5'),  true,  'Must read passages to read word problems'),
(sk('H15'), sk('H12'), false, 'Must know multiplication facts for mult/div word problems'),
(sk('H15'), sk('H13'), false, 'Must understand division for mult/div word problems'),
(sk('H15'), sk('F6'),  true,  'Must make inferences for multi-step word problems');

-- ----------------------------------------
-- Domain I prerequisites
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('I2'), sk('I1'), false, 'Must recognize shapes before describing attributes'),
(sk('I4'), sk('I2'), false, 'Must know shape attributes before composing shapes'),
(sk('I5'), sk('I2'), false, 'Must know 2D attributes before 3D shapes'),
(sk('I6'), sk('I4'), false, 'Must compose shapes before understanding symmetry'),
(sk('I7'), sk('I6'), false, 'Must understand symmetry before transformations');

-- ----------------------------------------
-- Domain J prerequisites (with cross-domain ⚡)
-- ----------------------------------------
INSERT INTO public.skill_prerequisites (skill_id, prerequisite_id, is_cross_domain, rationale) VALUES
(sk('J2'),  sk('J1'),  false, 'Must compare sizes before ordering by size'),
(sk('J3'),  sk('J2'),  false, 'Must order by size before measuring with units'),
(sk('J3'),  sk('G2'),  true,  'Must count with 1:1 correspondence to measure'),
(sk('J4'),  sk('J1'),  false, 'Must compare sizes before weight/capacity'),
(sk('J6'),  sk('J5'),  false, 'Must know days/sequence before reading clocks'),
(sk('J6'),  sk('G6'),  true,  'Must recognize numbers 0-20 to read clock face'),
(sk('J7'),  sk('J6'),  false, 'Must read hour/half-hour before 5-minute intervals'),
(sk('J7'),  sk('G8'),  true,  'Must count to 100 for minute reading'),
(sk('J8'),  sk('J3'),  false, 'Must use non-standard measurement before standard units'),
(sk('J8'),  sk('G9'),  true,  'Must recognize numbers to 100 for measurement values'),
(sk('J9'),  sk('G4'),  true,  'Must match quantity to numeral for coin values'),
(sk('J10'), sk('J9'),  false, 'Must identify coins before counting mixed coins'),
(sk('J10'), sk('H5'),  true,  'Must add within 10 to count coins'),
(sk('J11'), sk('G7'),  true,  'Must compare numbers to read graphs'),
(sk('J11'), sk('H5'),  true,  'Must add within 10 to create/read graphs');

-- Clean up helper function
DROP FUNCTION IF EXISTS public.sk(TEXT);


-- ============================================================
-- 4. STUDENT SKILL PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
  
  -- Skill status
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',     -- Haven't been assessed or attempted
    'needs_practice',  -- Assessed below 85% (50-84%)
    'struggling',      -- Assessed below 50%
    'ready_to_learn',  -- All prerequisites met, but not yet attempted
    'in_progress',     -- Currently working on it
    'mastered'         -- Score >= 85%
  )),
  
  -- Scoring
  current_score NUMERIC(5,2) DEFAULT 0 CHECK (current_score BETWEEN 0 AND 100),
  highest_score NUMERIC(5,2) DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  
  -- Timestamps
  first_assessed_at TIMESTAMPTZ,
  last_assessed_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  
  -- Teacher overrides
  teacher_override BOOLEAN NOT NULL DEFAULT false,
  override_status TEXT,                         -- If teacher manually set status
  override_note TEXT,                           -- Why teacher overrode
  override_by UUID REFERENCES public.profiles(id),
  override_at TIMESTAMPTZ,
  
  -- Assessment evidence
  evidence JSONB DEFAULT '[]'::jsonb,           -- History of assessment scores
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, skill_id)
);

CREATE INDEX idx_ssp_student ON public.student_skill_profiles(student_id);
CREATE INDEX idx_ssp_skill ON public.student_skill_profiles(skill_id);
CREATE INDEX idx_ssp_status ON public.student_skill_profiles(status);
CREATE INDEX idx_ssp_student_status ON public.student_skill_profiles(student_id, status);


-- ============================================================
-- 5. PLAYLIST CONFIGURATION (per-student settings)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.playlist_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  
  -- Configurable limits
  daily_skill_cap INT NOT NULL DEFAULT 5 CHECK (daily_skill_cap BETWEEN 1 AND 10),
  session_counter INT NOT NULL DEFAULT 0,          -- Tracks sessions for spiral review (every 5th)
  
  -- Teacher day overrides
  day_mode TEXT NOT NULL DEFAULT 'normal' CHECK (day_mode IN ('light', 'normal', 'power')),
  -- light = 3 items, normal = daily_skill_cap, power = daily_skill_cap + 3
  
  -- Focus areas (teacher can pin skills)
  focus_skill_ids UUID[] DEFAULT '{}',             -- Teacher-locked focus skills
  
  -- Preferences
  prefer_domains TEXT[] DEFAULT '{}',              -- Prioritize certain domains if set
  exclude_domains TEXT[] DEFAULT '{}',             -- Temporarily skip domains
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);


-- ============================================================
-- 6. PLAYLIST ITEMS (auto-generated daily playlist)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
  
  -- Scheduling
  playlist_date DATE NOT NULL DEFAULT CURRENT_DATE,
  display_order INT NOT NULL DEFAULT 0,
  
  -- Why this item is on the playlist
  reason TEXT NOT NULL CHECK (reason IN (
    'needs_practice',     -- Skill assessed at 50-84%
    'ready_to_learn',     -- All prereqs met, not yet attempted
    'foundational_gap',   -- Below 50%
    'spiral_review',      -- Every 5th session reinforcement
    'teacher_focus',      -- Teacher pinned this skill
    'teacher_added'       -- Teacher manually added
  )),
  priority INT NOT NULL DEFAULT 0,                -- Lower = higher priority
  
  -- Activity link (which activity to show for this skill)
  activity_id UUID REFERENCES public.activities(id),
  assignment_id UUID REFERENCES public.student_assignments(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'skipped'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Result (if completed)
  score NUMERIC(5,2),
  mastery_met BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playlist_student_date ON public.playlist_items(student_id, playlist_date);
CREATE INDEX idx_playlist_status ON public.playlist_items(status);
CREATE UNIQUE INDEX idx_playlist_student_date_skill ON public.playlist_items(student_id, playlist_date, skill_id);


-- ============================================================
-- 7. FUNCTIONS: Adaptive Playlist Engine
-- ============================================================

-- 7a. Initialize skill profiles for a new student
-- Creates a row for every skill, marks entry points as 'ready_to_learn'
CREATE OR REPLACE FUNCTION public.initialize_student_skills(p_student_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.student_skill_profiles (student_id, skill_id, status)
  SELECT p_student_id, sn.id,
    CASE WHEN sn.is_entry_point THEN 'ready_to_learn' ELSE 'not_started' END
  FROM public.skill_nodes sn
  ON CONFLICT (student_id, skill_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- 7b. Update skill status after assessment/practice
-- Records score, checks mastery, and cascades "ready_to_learn" to dependent skills
CREATE OR REPLACE FUNCTION public.update_skill_score(
  p_student_id UUID,
  p_skill_code TEXT,
  p_score NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_skill_id UUID;
  v_old_status TEXT;
  v_new_status TEXT;
  v_newly_mastered BOOLEAN := false;
  v_unlocked_skills TEXT[] := '{}';
  v_dep RECORD;
BEGIN
  -- Get skill ID
  SELECT id INTO v_skill_id FROM public.skill_nodes WHERE code = p_skill_code;
  IF v_skill_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Skill not found: ' || p_skill_code);
  END IF;
  
  -- Get current status
  SELECT status INTO v_old_status 
  FROM public.student_skill_profiles 
  WHERE student_id = p_student_id AND skill_id = v_skill_id;
  
  -- Determine new status
  IF p_score >= 85 THEN
    v_new_status := 'mastered';
    v_newly_mastered := (v_old_status != 'mastered');
  ELSIF p_score >= 50 THEN
    v_new_status := 'needs_practice';
  ELSE
    v_new_status := 'struggling';
  END IF;
  
  -- Update the profile
  UPDATE public.student_skill_profiles SET
    status = CASE WHEN teacher_override THEN status ELSE v_new_status END,
    current_score = p_score,
    highest_score = GREATEST(highest_score, p_score),
    attempts = attempts + 1,
    last_assessed_at = now(),
    first_assessed_at = COALESCE(first_assessed_at, now()),
    mastered_at = CASE 
      WHEN v_new_status = 'mastered' THEN COALESCE(mastered_at, now())
      ELSE mastered_at 
    END,
    evidence = evidence || jsonb_build_array(jsonb_build_object(
      'score', p_score, 'at', now(), 'attempt', attempts + 1
    )),
    updated_at = now()
  WHERE student_id = p_student_id AND skill_id = v_skill_id;
  
  -- If newly mastered, cascade: check if dependent skills should become 'ready_to_learn'
  IF v_newly_mastered THEN
    FOR v_dep IN
      SELECT sp.skill_id, sn.code
      FROM public.skill_prerequisites sp
      JOIN public.skill_nodes sn ON sn.id = sp.skill_id
      WHERE sp.prerequisite_id = v_skill_id
    LOOP
      -- Check if ALL prerequisites for this dependent skill are now mastered
      IF NOT EXISTS (
        SELECT 1 FROM public.skill_prerequisites prereq
        JOIN public.student_skill_profiles ssp 
          ON ssp.skill_id = prereq.prerequisite_id AND ssp.student_id = p_student_id
        WHERE prereq.skill_id = v_dep.skill_id
          AND ssp.status != 'mastered'
      ) THEN
        -- All prereqs met — mark as ready_to_learn if currently not_started
        UPDATE public.student_skill_profiles SET
          status = 'ready_to_learn',
          updated_at = now()
        WHERE student_id = p_student_id 
          AND skill_id = v_dep.skill_id
          AND status = 'not_started'
          AND NOT teacher_override;
        
        IF FOUND THEN
          v_unlocked_skills := array_append(v_unlocked_skills, v_dep.code);
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'skill', p_skill_code,
    'score', p_score,
    'status', v_new_status,
    'newly_mastered', v_newly_mastered,
    'unlocked_skills', to_jsonb(v_unlocked_skills)
  );
END;
$$ LANGUAGE plpgsql;


-- 7c. Generate daily playlist for a student
CREATE OR REPLACE FUNCTION public.generate_playlist(
  p_student_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  skill_code TEXT,
  skill_name TEXT,
  domain_name TEXT,
  domain_code CHAR(1),
  reason TEXT,
  priority INT,
  grade_band TEXT,
  status TEXT
) AS $$
DECLARE
  v_cap INT;
  v_day_mode TEXT;
  v_effective_cap INT;
  v_session_counter INT;
  v_focus_skills UUID[];
BEGIN
  -- Get playlist config
  SELECT pc.daily_skill_cap, pc.day_mode, pc.session_counter, pc.focus_skill_ids
  INTO v_cap, v_day_mode, v_session_counter, v_focus_skills
  FROM public.playlist_config pc
  WHERE pc.student_id = p_student_id;
  
  -- Default if no config exists
  IF v_cap IS NULL THEN
    v_cap := 5;
    v_day_mode := 'normal';
    v_session_counter := 0;
    v_focus_skills := '{}';
    
    -- Auto-create config
    INSERT INTO public.playlist_config (student_id)
    VALUES (p_student_id)
    ON CONFLICT (student_id) DO NOTHING;
  END IF;
  
  -- Calculate effective cap based on day mode
  v_effective_cap := CASE v_day_mode
    WHEN 'light' THEN LEAST(3, v_cap)
    WHEN 'power' THEN v_cap + 3
    ELSE v_cap
  END;
  
  -- Delete existing playlist for this date (regenerate)
  DELETE FROM public.playlist_items 
  WHERE playlist_items.student_id = p_student_id 
    AND playlist_date = p_date
    AND status = 'pending';  -- Don't delete in-progress or completed items
  
  -- Build playlist using priority rules:
  -- 1. Teacher focus skills (always included)
  -- 2. Needs practice (50-84%, highest impact)
  -- 3. Ready to learn (prereqs met, not started)
  -- 4. Struggling / foundational gaps (below 50%)
  -- 5. Spiral review (every 5th session, one recently mastered skill)
  
  RETURN QUERY
  WITH ranked_skills AS (
    -- Teacher-focused skills (priority 0)
    SELECT sn.code, sn.name, sd.name AS domain_name, sd.code AS d_code,
           'teacher_focus'::text AS reason, 0 AS priority, sn.grade_band, ssp.status,
           ROW_NUMBER() OVER (ORDER BY sn.display_order) AS rn
    FROM public.student_skill_profiles ssp
    JOIN public.skill_nodes sn ON sn.id = ssp.skill_id
    JOIN public.skill_domains sd ON sd.id = sn.domain_id
    WHERE ssp.student_id = p_student_id
      AND ssp.skill_id = ANY(v_focus_skills)
      AND ssp.status != 'mastered'
    
    UNION ALL
    
    -- Needs practice (priority 1)
    SELECT sn.code, sn.name, sd.name, sd.code,
           'needs_practice'::text, 1, sn.grade_band, ssp.status,
           ROW_NUMBER() OVER (ORDER BY ssp.current_score DESC, sn.display_order) AS rn
    FROM public.student_skill_profiles ssp
    JOIN public.skill_nodes sn ON sn.id = ssp.skill_id
    JOIN public.skill_domains sd ON sd.id = sn.domain_id
    WHERE ssp.student_id = p_student_id
      AND ssp.status = 'needs_practice'
      AND NOT ssp.teacher_override
      AND NOT (ssp.skill_id = ANY(v_focus_skills))
    
    UNION ALL
    
    -- Ready to learn (priority 2)
    SELECT sn.code, sn.name, sd.name, sd.code,
           'ready_to_learn'::text, 2, sn.grade_band, ssp.status,
           ROW_NUMBER() OVER (ORDER BY sn.grade_level_approx, sn.display_order) AS rn
    FROM public.student_skill_profiles ssp
    JOIN public.skill_nodes sn ON sn.id = ssp.skill_id
    JOIN public.skill_domains sd ON sd.id = sn.domain_id
    WHERE ssp.student_id = p_student_id
      AND ssp.status = 'ready_to_learn'
      AND NOT ssp.teacher_override
      AND NOT (ssp.skill_id = ANY(v_focus_skills))
    
    UNION ALL
    
    -- Struggling (priority 3)
    SELECT sn.code, sn.name, sd.name, sd.code,
           'foundational_gap'::text, 3, sn.grade_band, ssp.status,
           ROW_NUMBER() OVER (ORDER BY sn.grade_level_approx, sn.display_order) AS rn
    FROM public.student_skill_profiles ssp
    JOIN public.skill_nodes sn ON sn.id = ssp.skill_id
    JOIN public.skill_domains sd ON sd.id = sn.domain_id
    WHERE ssp.student_id = p_student_id
      AND ssp.status = 'struggling'
      AND NOT ssp.teacher_override
      AND NOT (ssp.skill_id = ANY(v_focus_skills))
    
    UNION ALL
    
    -- Spiral review: one recently mastered skill every 5th session
    SELECT sn.code, sn.name, sd.name, sd.code,
           'spiral_review'::text, 4, sn.grade_band, ssp.status,
           ROW_NUMBER() OVER (ORDER BY ssp.mastered_at DESC) AS rn
    FROM public.student_skill_profiles ssp
    JOIN public.skill_nodes sn ON sn.id = ssp.skill_id
    JOIN public.skill_domains sd ON sd.id = sn.domain_id
    WHERE ssp.student_id = p_student_id
      AND ssp.status = 'mastered'
      AND ssp.mastered_at IS NOT NULL
      AND (v_session_counter + 1) % 5 = 0  -- Every 5th session
      AND NOT ssp.teacher_override
  )
  SELECT rs.code, rs.name, rs.domain_name, rs.d_code, rs.reason, rs.priority, rs.grade_band, rs.status
  FROM ranked_skills rs
  WHERE rs.rn <= CASE 
    WHEN rs.priority = 0 THEN 10  -- No limit on teacher focus
    WHEN rs.priority = 4 THEN 1   -- Max 1 spiral review
    ELSE v_effective_cap 
  END
  ORDER BY rs.priority, rs.rn
  LIMIT v_effective_cap;
END;
$$ LANGUAGE plpgsql;


-- 7d. Record playlist completion and trigger skill update
CREATE OR REPLACE FUNCTION public.complete_playlist_item(
  p_playlist_item_id UUID,
  p_score NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_skill_code TEXT;
  v_result JSONB;
BEGIN
  -- Get the playlist item details
  SELECT pi.student_id, sn.code
  INTO v_student_id, v_skill_code
  FROM public.playlist_items pi
  JOIN public.skill_nodes sn ON sn.id = pi.skill_id
  WHERE pi.id = p_playlist_item_id;
  
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Playlist item not found');
  END IF;
  
  -- Mark playlist item as completed
  UPDATE public.playlist_items SET
    status = 'completed',
    completed_at = now(),
    score = p_score,
    mastery_met = (p_score >= 85),
    updated_at = now()
  WHERE id = p_playlist_item_id;
  
  -- Update the skill score (which handles cascading unlocks)
  v_result := public.update_skill_score(v_student_id, v_skill_code, p_score);
  
  -- Increment session counter
  UPDATE public.playlist_config SET
    session_counter = session_counter + 1,
    updated_at = now()
  WHERE student_id = v_student_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- 7e. Get student's complete skill profile (for teacher Mission Control / parent view)
CREATE OR REPLACE FUNCTION public.get_student_skill_profile(p_student_id UUID)
RETURNS TABLE (
  domain_code CHAR(1),
  domain_name TEXT,
  category TEXT,
  skill_code TEXT,
  skill_name TEXT,
  grade_band TEXT,
  status TEXT,
  current_score NUMERIC,
  attempts INT,
  mastered_at TIMESTAMPTZ,
  teacher_override BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.code AS domain_code,
    sd.name AS domain_name,
    sd.category,
    sn.code AS skill_code,
    sn.name AS skill_name,
    sn.grade_band,
    ssp.status,
    ssp.current_score,
    ssp.attempts,
    ssp.mastered_at,
    ssp.teacher_override
  FROM public.student_skill_profiles ssp
  JOIN public.skill_nodes sn ON sn.id = ssp.skill_id
  JOIN public.skill_domains sd ON sd.id = sn.domain_id
  WHERE ssp.student_id = p_student_id
  ORDER BY sd.display_order, sn.display_order;
END;
$$ LANGUAGE plpgsql;


-- 7f. Teacher override: manually set skill status
CREATE OR REPLACE FUNCTION public.teacher_override_skill(
  p_student_id UUID,
  p_skill_code TEXT,
  p_new_status TEXT,
  p_teacher_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_skill_id UUID;
BEGIN
  SELECT id INTO v_skill_id FROM public.skill_nodes WHERE code = p_skill_code;
  IF v_skill_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Skill not found');
  END IF;
  
  UPDATE public.student_skill_profiles SET
    status = p_new_status,
    teacher_override = true,
    override_status = p_new_status,
    override_note = p_note,
    override_by = p_teacher_id,
    override_at = now(),
    mastered_at = CASE WHEN p_new_status = 'mastered' THEN COALESCE(mastered_at, now()) ELSE mastered_at END,
    updated_at = now()
  WHERE student_id = p_student_id AND skill_id = v_skill_id;
  
  -- If marked mastered, cascade to dependents
  IF p_new_status = 'mastered' THEN
    PERFORM public.update_skill_score(p_student_id, p_skill_code, 100);
  END IF;
  
  RETURN jsonb_build_object(
    'skill', p_skill_code,
    'new_status', p_new_status,
    'overridden_by', p_teacher_id
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.skill_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Reference tables: readable by all authenticated users
CREATE POLICY "Anyone can read skill_domains" ON public.skill_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read skill_nodes" ON public.skill_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read skill_prerequisites" ON public.skill_prerequisites FOR SELECT TO authenticated USING (true);

-- Admin manages reference tables
CREATE POLICY "Admins manage skill_domains" ON public.skill_domains FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Admins manage skill_nodes" ON public.skill_nodes FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Admins manage skill_prerequisites" ON public.skill_prerequisites FOR ALL TO authenticated USING (public.get_my_role() = 'admin');

-- Student skill profiles: students see own, parents see children, teachers see all
CREATE POLICY "Students read own skill profiles" ON public.student_skill_profiles FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Parents read children skill profiles" ON public.student_skill_profiles FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers manage skill profiles" ON public.student_skill_profiles FOR ALL TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));

-- Playlist config: similar pattern
CREATE POLICY "Students read own playlist config" ON public.playlist_config FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Parents read children playlist config" ON public.playlist_config FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers manage playlist config" ON public.playlist_config FOR ALL TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));

-- Playlist items: students see own, parents see children, teachers manage
CREATE POLICY "Students read own playlist" ON public.playlist_items FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Students update own playlist" ON public.playlist_items FOR UPDATE TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Parents read children playlist" ON public.playlist_items FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers manage playlists" ON public.playlist_items FOR ALL TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));

-- ============================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_ssp_updated_at BEFORE UPDATE ON public.student_skill_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_playlist_config_updated_at BEFORE UPDATE ON public.playlist_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_playlist_items_updated_at BEFORE UPDATE ON public.playlist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- MIGRATION COMPLETE
-- Total new tables: 6 (skill_domains, skill_nodes, skill_prerequisites,
--                      student_skill_profiles, playlist_config, playlist_items)
-- Total new functions: 6 (initialize_student_skills, update_skill_score,
--                        generate_playlist, complete_playlist_item,
--                        get_student_skill_profile, teacher_override_skill)
-- Total seeded data: 10 domains, 94 skills, ~105 prerequisite links
-- ============================================================
