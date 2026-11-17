# Gamification Spike

Research into how existing K-12 / edtech products use gamification, and how
those patterns translate into Aviation missions, games, and reward mechanics
for Pink STEM.

## Reference Products

### 1. Duolingo

**Core loop:** Complete a short lesson, receive immediate feedback, earn XP,
maintain a streak, and continue progressing through the course. Students are
encouraged to return regularly through streaks, milestones, and optional
leaderboard competition.

**Unit of reward:**

- XP for completing lessons and activities
- Daily streaks
- Milestones and bonuses
- League/leaderboard progress

**Why it works for K-12:** Duolingo breaks learning into short activities with
clear goals and immediate feedback. Students can easily see their progress,
and rewards like XP and streaks give them a reason to continue without making
the reward system overly complicated.

**Takeaway for Pink STEM:** Pink STEM could use a similar loop where students
complete an Aviation mission, receive feedback, earn points, and make visible
progress toward the next mission or badge.

### 2. Khan Academy

**Core loop:** Learn a concept, complete practice problems or an assessment,
receive feedback, and improve mastery of individual skills. Students can
continue practicing until they move from familiar to proficient to mastered.

**Unit of reward:**

- Energy points for completing learning activities
- Mastery points for demonstrating knowledge
- Badges for milestones and achievements
- Unlockable avatars and avatar upgrades

**Why it works for K-12:** The reward system connects directly to learning
progress instead of rewarding competition alone. Students can see which
skills they have mastered and which ones still need work, while badges and
points provide smaller motivational rewards along the way.

**Takeaway for Pink STEM:** Pink STEM should similarly connect major rewards
to demonstrated learning. Points can reward completing missions, while badges
should represent meaningful accomplishments such as completing an Aviation
module or demonstrating a specific skill.

### 3. Quizizz

**Core loop:** Answer questions or complete an activity, immediately see
whether the response was correct, earn points, and continue through the
session. Depending on the mode, students can also use power-ups, retry
questions, and compare their progress with others.

**Unit of reward:**

- Game score
- Accuracy points
- Power-ups
- Leaderboard position
- Progress toward an activity goal

Quizizz intentionally separates academic accuracy points from its gamified
score. Game mechanics can change a student's game score without changing the
academic score that can be sent to an LMS.

**Why it works for K-12:** Quizizz gives students constant feedback and makes
normal classroom questions feel more interactive. Features such as retries,
team modes, and power-ups can make mistakes feel less punishing and encourage
students to stay engaged.

**Takeaway for Pink STEM:** Separating academic performance from
gamification points is especially useful for Pink STEM. A student could have
a mission score that teachers eventually use for grading while separately
earning points or badges for engagement and completion.

### 4. Code.org

**Core loop:** Students move through a sequence of lessons and small
interactive programming activities. Each completed level advances their
visible progress through the lesson or course, while teachers can see which
levels are complete, in progress, or need review.

**Unit of reward:**

- Completed levels
- Lesson/course progress
- Successful completion of challenges
- Visible progress indicators

Unlike Duolingo or Quizizz, Code.org relies less heavily on points and
competitive rewards and more heavily on showing students that they are
moving forward through a sequence of challenges.

**Why it works for K-12:** Activities are broken into small, achievable
steps, so students rarely face one large assignment all at once. Visible
progression gives students a sense of accomplishment and makes it clear what
they should do next.

**Takeaway for Pink STEM:** Pink STEM's Course → Module → Mission structure
maps well to this approach. Students could see themselves progressing
through an Aviation "flight plan," with each completed mission moving them
closer to completing a module or earning a badge.

## Main Lessons for Pink STEM

Across these products, the most effective pattern is:

> Complete an activity → receive immediate feedback → earn a small reward →
> see visible progress → move to the next challenge.

Pink STEM should combine the strongest parts of these systems:

- **Duolingo:** simple points and visible progression
- **Khan Academy:** rewards tied to actual learning and mastery
- **Quizizz:** separation between academic scores and gamification rewards
- **Code.org:** clear progression through small, achievable activities

The system should avoid becoming a complicated game economy. For the MVP,
mission points, badges, and visible module progress provide enough
gamification while remaining feasible to build.

## Aviation Game Ideas

The Aviation course should use small scenario-based games that can be
implemented as normal React components inside a Mission. Games should focus
on decision-making and problem solving rather than complex simulations. The
following ideas avoid 3D graphics, physics engines, multiplayer functionality,
and other features that would be difficult to complete this semester.

### 1. Balance the Forces — _Difficulty: Easy_

**Concept:** Aerodynamics and the four forces of flight: lift, weight,
thrust, and drag.

**Game:** The student is shown an airplane in a scenario such as takeoff,
level flight, or descent. They adjust simple sliders for forces such as
thrust and lift until the aircraft reaches the desired state.

> Your aircraft is flying straight and level, but drag has increased. What
> needs to change to maintain the same speed?

Students adjust the forces and receive immediate feedback explaining their
choices.

**Why it is feasible:** This only requires sliders, simple predefined
relationships between values, and a 2D airplane graphic. It does not need an
actual physics simulation.

### 2. Preflight Inspection — _Difficulty: Easy_

**Concept:** Aircraft safety and identifying problems before flight.

**Game:** Students inspect a 2D diagram or image of an aircraft before
takeoff. Several areas of the aircraft can be clicked, such as the wings,
tires, propeller, fuel, and control surfaces. Some missions contain problems
that the student must identify before approving the aircraft for flight.

**Why it is feasible:** The game can be implemented with clickable hotspots
over a static image. Each hotspot simply stores a correct, incorrect, or
informational state.

### 3. Load the Aircraft — _Difficulty: Medium_

**Concept:** Aircraft weight, payload, and balance.

**Game:** The student is given an aircraft with passengers, luggage,
equipment, and fuel that need to be loaded. They drag items into different
positions in the aircraft while staying below a maximum weight and keeping
the aircraft balanced.

The interface could display:

- Total aircraft weight
- Maximum allowed weight
- Simplified center-of-gravity range
- Remaining capacity

The student completes the mission once the aircraft is safe for departure.

**Why it is feasible:** Weight and balance can be simplified into
deterministic calculations. Drag-and-drop components and basic arithmetic
are enough to implement the game.

### 4. Weather: Go or No-Go? — _Difficulty: Easy_

**Concept:** Aviation weather and pilot decision-making.

**Game:** Students are given a planned flight along with simplified weather
information such as wind, thunderstorms, visibility, and cloud conditions.
They choose between decisions such as:

- Depart
- Delay the flight
- Change the route
- Cancel the flight

After choosing, students receive an explanation of the safest decision and
why. Later missions could introduce multiple pieces of information that
students need to consider together.

**Why it is feasible:** Each scenario can be stored as predefined data with
weather conditions, choices, and explanations. No live weather API is
necessary.

### 5. Plan the Flight — _Difficulty: Medium_

**Concept:** Navigation, distance, flight time, and fuel planning.

**Game:** Students are shown a simplified 2D map containing an airport and
several checkpoints. They must create a flight path to the destination while
considering distance, available fuel, and possibly weather hazards.

A basic version could ask students to choose the correct route. A more
advanced mission could have students calculate:

> Flight Time = Distance / Speed

and then determine whether the aircraft has enough fuel.

**Why it is feasible:** The map can be a static SVG or image with predefined
checkpoints. Routes and calculations can be handled using normal React state
without needing Google Maps or another mapping service.

### 6. Build the Traffic Pattern — _Difficulty: Easy_

**Concept:** Airport operations and the standard airport traffic pattern.

**Game:** Students are shown an airport runway and must place the stages of
a traffic pattern in the correct order:

1. Departure
2. Crosswind
3. Downwind
4. Base
5. Final

A later mission could present an aircraft at a particular position and ask
which stage comes next.

**Why it is feasible:** This can be implemented as a sequencing or
drag-and-drop activity over a static airport diagram.

### 7. Cockpit Instrument Challenge — _Difficulty: Easy_

**Concept:** Basic aircraft instruments.

**Game:** Students are presented with a simplified cockpit dashboard and a
scenario.

> Your altimeter shows 5,000 feet and your target altitude is 6,000 feet.
> What should the pilot do?

Other missions could ask students to identify which instrument shows
altitude, speed, heading, or vertical movement. Students could also match
instruments with what they measure.

**Why it is feasible:** Instruments can be static graphics with predefined
values. We do not need to build a functioning flight simulator or animate
the entire cockpit.

### 8. Aviation Emergency Decision Mission — _Difficulty: Easy to Medium_

**Concept:** Aeronautical decision-making and problem solving.

**Game:** Students progress through a branching scenario where something
goes wrong during a fictional flight.

> You are approaching your destination when you learn that a thunderstorm
> has moved over the airport.

The student chooses what to do next. Each decision changes the next part of
the scenario until the student reaches a successful or unsuccessful outcome.
The goal is less about memorizing procedures and more about evaluating
information and making safe decisions.

**Why it is feasible:** The scenario can be represented as a small decision
tree containing text, choices, and predefined outcomes. This could become a
reusable component for many future Pink STEM missions.

### 9. Design Your Aircraft — _Difficulty: Medium_

**Concept:** Engineering tradeoffs in aircraft design.

**Game:** Students are given a mission such as:

> Design an aircraft that can carry four passengers 600 miles while using as
> little fuel as possible.

Students select from predefined options for features such as:

- Wing type
- Engine
- Fuel capacity
- Passenger capacity
- Aircraft weight

Different choices affect simplified statistics for range, speed, capacity,
and efficiency. Students try to meet the mission requirements.

**Why it is feasible:** Instead of simulating real aerodynamics, each
component can have predefined effects on the aircraft's statistics. The
final aircraft score is calculated using simple rules.

### 10. Fix the Aircraft Circuit — _Difficulty: Medium_

**Concept:** Electronics in aviation.

**Game:** Students are shown a simplified electrical system containing
components such as a battery, switch, light, and cockpit instrument. They
must connect components in the correct order or identify which component is
causing a circuit to fail.

> The landing light is not receiving power. Which part of the circuit is
> preventing current from reaching it?

This could connect particularly well with Pink STEM's existing emphasis on
electronics in aviation.

**Why it is feasible:** The first version can use predefined connection
points and drag-and-drop wires rather than implementing a full electrical
circuit simulator.

## Recommended Gamification Mechanics

Pink STEM should focus on a small set of mechanics that are easy to
understand, tied directly to learning, and realistic to build this semester.

### 1. Mission Points

Students earn points for completing missions and solving scenario-based
challenges. Points should be awarded for actions such as:

- Completing a mission
- Successfully solving a scenario
- Completing a module
- Reaching specific learning milestones

Points should represent progress and engagement, not replace a student's
academic score. For example, a student could earn 50 mission points for
completing a weather challenge while separately receiving an 80% academic
score.

**Why include it:** Points provide immediate feedback and give students a
simple sense of progress. They are also straightforward to implement using
the append-only Award ledger.

### 2. Badges

Students earn badges for meaningful achievements. Examples could include:

- **First Flight** — Complete the first Aviation mission
- **Weather Watcher** — Complete all Aviation weather missions
- **Flight Planner** — Successfully complete a navigation and
  flight-planning mission
- **Aviation Explorer** — Complete an entire Aviation module

Badges should represent actual accomplishments instead of being awarded for
arbitrary actions.

**Why include it:** Badges give students longer-term goals beyond individual
missions and can eventually connect to Pink STEM's career-path
recommendations.

### 3. Flight Path Progress

Instead of using a generic XP progress bar, students should see their course
progress as a themed flight path.

> Atlanta → Mission 1 → Mission 2 → Mission 3 → Module Badge → Destination

Completing missions moves the student's aircraft farther along the route.

**Why include it:** This provides clear visual progress while matching Pink
STEM's Aviation and aerospace branding. It also gives students a clear
answer to "What should I do next?" without adding another complicated
reward system.

### 4. Personal Milestones

Students can receive small milestone achievements based on their own
progress. Examples include:

- Complete 5 missions
- Complete a mission with a perfect score
- Complete every mission in a module
- Improve a previous mission score
- Complete missions in multiple Aviation topics

These milestones should focus on individual growth rather than comparing
students against one another.

**Why include it:** Personal milestones encourage continued participation
while allowing students with different skill levels and schedules to feel
successful.
