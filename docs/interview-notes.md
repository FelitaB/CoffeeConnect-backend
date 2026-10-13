# Executive Context & Problem Statement

## The Challenge
Rapid onboarding of approximately **40 new team members** has created siloing and strained informal cross-team collaboration.

## Seniority Barrier
Newer and junior team members experience friction and hesitation when attempting to "cold call" or reach out to senior leadership for informal catch-ups.

## Remote Isolation
While office-based colleagues benefit from informal breakout spaces and spontaneous interactions, remote and hybrid workers often feel detached from social networks and serendipitous conversations.

## Business & Cultural Impact

- Enhances day-to-day engagement and belonging, reducing social friction and onboarding anxiety.
- Supports colleague retention, helping reduce recruitment, onboarding, and training costs.
- Strengthens organisational productivity and cross-hub collaboration.
- Encourages knowledge sharing across teams and seniority levels.

---

# Consolidated System Requirements & Business Rules

## A. Matching & "Spin" Algorithm Rules

### 1. No Self-Matching
Users must never be matched with themselves.

### 2. Prioritisation Hierarchy

#### Tier 1: Shared Interests
- Match users with colleagues who share the greatest number of overlapping interests.

#### Tier 2: Location & Remote Awareness
- Remote users should be prioritised for matches with other remote colleagues and virtual coffee chats.
- Office-based users should be prioritised for colleagues within the same hub (London, Manchester, or Belfast), while still allowing occasional cross-office matches.

#### Tier 3: Zero-Interest Fallback
- If no shared interests exist:
  - Attempt to match users within the same office hub.
  - Otherwise match users with the same working arrangement (e.g., remote).
  - If neither is possible, assign a random eligible match rather than returning no result.

### 3. Frictionless Connection
Matched users can connect immediately without requiring a formal friend request or connection acceptance process before scheduling a coffee chat.

### 4. Rate Limiting & Pacing

- Maximum **1 coffee chat per day** per user.
- Maximum **2 matches per week** per user.
- The system must prevent users from exceeding these limits to avoid calendar overload.

---

## B. User & Interest Data Model

### Interests
- Users select interests from a predefined dropdown list of broad topics.
- Example categories include:
  - AI
  - Gaming
  - Football
  - Cooking
  - Travel
  - Running
  - Board Games
  - Music
  - Cloud Architecture
  - Reading

### Interest Limit
- Users may select a maximum of **10 interests**.

### Profile Information
A user profile must display:

- Full name
- Email address
- Hub / work arrangement:
  - London
  - Manchester
  - Belfast
  - Remote
- Active interests

### Seed Data
The database must be pre-populated with mock users to support immediate testing, demonstrations, and validation of the matching algorithm.