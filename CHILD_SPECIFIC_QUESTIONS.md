# Child-Specific Questions Feature

## Overview
Parents can now assign questions to specific children or keep them general for all children. This allows for personalized learning experiences tailored to each child's needs.

## How It Works

### For Parents (CreateQuestions Screen)

1. **Creating Questions**:
   - When creating a new question (manually or with AI), you'll see a "Assign To:" selector
   - Choose "👥 All Children" to make the question available to everyone
   - Or select a specific child's name to assign it only to them

2. **Viewing Questions**:
   - In the "QUESTIONS" tab, each question shows who it's assigned to
   - Questions display either "👥 All Children" or "👤 [Child Name]"

### For Children (Games & Quizzes)

- When a child plays games (Snake, Flappy Bird, Fruit Ninja) or takes quizzes:
  - They will see questions assigned specifically to them
  - Plus any general questions (marked for "All Children")
  - They won't see questions assigned to other children

## Database Changes

A new `child_id` column was added to the `questions` table:
- **Type**: UUID (references child_profiles.id)
- **Nullable**: Yes (NULL = available to all children)
- **On Delete**: SET NULL (if child is deleted, question becomes general)

## Implementation Details

### Files Modified

1. **CreateQuestions.jsx**:
   - Added child selector UI (horizontal scrollable chips)
   - Loads children on mount
   - Includes child_id in question payload
   - Displays child assignment in questions list

2. **fetchquestions.ts**:
   - Updated to accept optional `childId` parameter
   - Filters questions by child_id OR null (general questions)
   - Returns appropriate questions for each child

3. **QuizScreen.jsx**:
   - Passes selectedChild.id to fetchQuestions
   - Shows child-specific and general questions

4. **Game Files** (FruitNinjaGame.tsx, flappy.js, SnakeGame.tsx):
   - All games now pass child_id when fetching questions
   - Ensures children only see relevant questions during gameplay

### Migration Required

Run the SQL migration in `database/migration-add-child-id.sql` on your Supabase database:

```sql
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES child_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_child_id ON questions(child_id);
```

## Usage Examples

### Example 1: Math Questions for Younger Child
- Parent creates multiplication questions
- Assigns them to "Tommy" (age 6)
- Tommy's sibling Sarah (age 10) won't see these basic questions

### Example 2: Safety Questions for All
- Parent creates traffic safety questions
- Selects "👥 All Children"
- Both Tommy and Sarah see these questions

### Example 3: Advanced Reading for Older Child
- Parent creates complex reading comprehension questions
- Assigns them to "Sarah" only
- Tommy won't be overwhelmed by advanced content

## Benefits

1. **Personalized Learning**: Tailor content to each child's skill level
2. **Age-Appropriate**: Younger children won't see advanced questions
3. **Flexible**: Mix of shared and individual questions
4. **Scalable**: Works with any number of children
5. **Optional**: Parents can still create general questions for all

## UI/UX Details

### Child Selector Design
- Horizontal scrollable chips
- "All Children" option with 👥 icon
- Individual children with their names
- Selected state: Blue background (#4A90E2)
- Unselected state: Gray background (#E8E8E8)
- Clear visual feedback

### Questions List Display
- Shows assignment info below question type
- Blue color (#4A90E2) for easy identification
- Compact, non-intrusive display
