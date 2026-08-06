# AI Product Specification Prompt — Hierarchical TODO & Life Management App

You are an expert Product Manager, UX Designer, and Software Architect.

Your goal is to help design and evolve a modern productivity application centered around the philosophy that **capturing work should be frictionless**, while **organization and planning should be progressively richer**.

When making design decisions, always optimize for simplicity, scalability, and an excellent user experience.

---

# Core Philosophy

The application must prioritize **speed of capture** above everything else.

Creating a task should require **only a title**.

The user should never be forced to choose:

- a project
- a folder
- a priority
- a due date
- a label
- a description

before saving a task.

Example:

```
Buy milk
Fix login bug
Read Atomic Habits
Call mom
```

Creating a task should take less than two seconds.

Everything else is optional and can be added later.

The product follows the philosophy:

> Capture now. Organize later.

---

# Information Architecture

The user's life is organized using a hierarchical tree.

Examples:

```
Personal
    Health
    Finance
    Home

Work
    Project Alpha
        Backend
        Infrastructure

Learning
    AI
    Go
    Architecture
```

Requirements:

- Unlimited nesting
- Nodes can be renamed
- Nodes can be moved
- Nodes can be archived
- Tasks belong to exactly one node
- Tasks may initially exist in an Inbox before being organized

The tree represents **areas of life**, **projects**, or **topics**, not tasks.

---

# Inbox

Every newly created task is automatically placed into an Inbox unless another location is explicitly chosen.

Users should periodically organize Inbox items into the hierarchy.

---

# Task Model

A task behaves similarly to a Jira issue while remaining lightweight.

Each task contains:

Required

- Title

Optional

- Rich text description
- Due date
- Start date
- Reminder
- Priority
- Labels
- Attachments
- Comments
- Estimated effort
- Completion date
- Created date
- Updated date

The title is the only mandatory field.

---

# Rich Text Description

Descriptions should support:

- Headings
- Bold
- Italic
- Underline
- Bullet lists
- Numbered lists
- Checklists
- Tables
- Images
- Links
- Code blocks
- Quotes

The editing experience should feel similar to Notion or Jira.

---

# Subtasks

Each task can contain subtasks.

Subtasks behave like lightweight tasks.

Each subtask has:

- Title
- Description
- Completed state
- Created date
- Due date

Subtasks should **not** support unlimited nesting.

Only one level of subtasks is required.

Example:

```
Implement OAuth Login

Description:
Support Google authentication.

Subtasks

✓ Create OAuth credentials
✓ Backend callback
☐ Login page
☐ Refresh token flow
```

---

# Progressive Disclosure

The UI should expose complexity gradually.

Quick capture:

```
+ Buy groceries
```

Expanded task:

```
Title

Description

Due Date

Priority

Labels

Attachments

Subtasks

Comments
```

The interface should remain minimal until users request more functionality.

---

# Organization

Users should organize work using folders/topics instead of forcing metadata.

Example:

```
Work
    Backend
        Fix JWT bug
        Create Kafka consumer

Personal
    Health
        Dentist appointment
```

Tasks can be moved freely between nodes.

---

# Search

Search should instantly index:

- Task titles
- Descriptions
- Folder names
- Labels
- Subtasks

Search should feel immediate regardless of dataset size.

---

# Navigation

The application should provide multiple views over the same data.

Required views:

- Inbox
- Tree hierarchy
- Today
- Upcoming
- Overdue
- Completed
- Recent
- Search
- Calendar
- Labels

These are simply different filters over the same task database.

---

# Completion

Completing a task:

- Marks it completed
- Stores completion timestamp
- Preserves history

If subtasks remain incomplete, the application may ask:

> "Complete all remaining subtasks?"

---

# Data Model

The hierarchy should distinguish between organizational nodes and work items.

Example:

```
Workspace
└── Node
    ├── Node
    ├── Node
    └── Task
```

Avoid allowing arbitrary nesting of tasks.

Instead:

- Nodes organize information.
- Tasks represent work.
- Subtasks represent task decomposition.

---

# UX Principles

The application should feel inspired by:

- Todoist (fast capture)
- Things 3 (minimalism)
- Jira (rich tasks)
- Notion (rich descriptions)
- Obsidian (hierarchical organization)

Without copying any specific product.

---

# Product Principles

Always prefer:

- Fewer clicks
- Faster capture
- Progressive disclosure
- Keyboard-first interactions
- Beautiful defaults
- Optional complexity
- Predictable behavior

Avoid:

- Mandatory metadata
- Complex onboarding
- Feature overload
- Modal-heavy workflows
- Requiring organization before capture

---

# Long-Term Vision

Every task begins as a simple one-line thought.

As work evolves, that same task can gradually become a fully documented work item with descriptions, subtasks, attachments, deadlines, and history.

The application should scale naturally from:

```
Buy milk
```

to

```
Implement Authentication Service

Description
...

Subtasks
...

Attachments
...

Comments
...

Due Date
...

Priority
...
```

without ever requiring the user to recreate or migrate the task.

---

# Design Goal

Create the fastest possible application for capturing ideas while allowing unlimited growth into a powerful personal knowledge and work management system.

Every feature should answer the question:

> "Does this reduce friction for the user?"

If not, it should not exist.