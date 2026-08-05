export interface Exercise {
  id: string;
  name: string;
  muscle: string;       // Primary muscle group
  equipment: string;
  type: 'compound' | 'isolation' | 'cardio' | 'bodyweight';
}

export const EXERCISES: Exercise[] = [
  // ─── Chest ───────────────────────────────────────────────────────────────────
  { id: 'bench_press',          name: 'Barbell Bench Press',     muscle: 'Chest',      equipment: 'Barbell',   type: 'compound' },
  { id: 'incline_bench',        name: 'Incline Barbell Press',   muscle: 'Chest',      equipment: 'Barbell',   type: 'compound' },
  { id: 'decline_bench',        name: 'Decline Barbell Press',   muscle: 'Chest',      equipment: 'Barbell',   type: 'compound' },
  { id: 'db_bench',             name: 'Dumbbell Bench Press',    muscle: 'Chest',      equipment: 'Dumbbell',  type: 'compound' },
  { id: 'incline_db_bench',     name: 'Incline Dumbbell Press',  muscle: 'Chest',      equipment: 'Dumbbell',  type: 'compound' },
  { id: 'db_fly',               name: 'Dumbbell Fly',            muscle: 'Chest',      equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'cable_fly',            name: 'Cable Fly',               muscle: 'Chest',      equipment: 'Cable',     type: 'isolation' },
  { id: 'pushup',               name: 'Push-Up',                 muscle: 'Chest',      equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'chest_dip',            name: 'Chest Dip',               muscle: 'Chest',      equipment: 'Bodyweight',type: 'compound' },
  { id: 'pec_deck',             name: 'Pec Deck Machine',        muscle: 'Chest',      equipment: 'Machine',   type: 'isolation' },

  // ─── Back ─────────────────────────────────────────────────────────────────────
  { id: 'deadlift',             name: 'Deadlift',                muscle: 'Back',       equipment: 'Barbell',   type: 'compound' },
  { id: 'barbell_row',          name: 'Barbell Row',             muscle: 'Back',       equipment: 'Barbell',   type: 'compound' },
  { id: 'pullup',               name: 'Pull-Up',                 muscle: 'Back',       equipment: 'Bodyweight',type: 'compound' },
  { id: 'chinup',               name: 'Chin-Up',                 muscle: 'Back',       equipment: 'Bodyweight',type: 'compound' },
  { id: 'lat_pulldown',         name: 'Lat Pulldown',            muscle: 'Back',       equipment: 'Cable',     type: 'compound' },
  { id: 'seated_cable_row',     name: 'Seated Cable Row',        muscle: 'Back',       equipment: 'Cable',     type: 'compound' },
  { id: 'db_row',               name: 'Dumbbell Row',            muscle: 'Back',       equipment: 'Dumbbell',  type: 'compound' },
  { id: 'tbar_row',             name: 'T-Bar Row',               muscle: 'Back',       equipment: 'Barbell',   type: 'compound' },
  { id: 'face_pull',            name: 'Face Pull',               muscle: 'Back',       equipment: 'Cable',     type: 'isolation' },
  { id: 'straight_arm_pulldown',name: 'Straight-Arm Pulldown',   muscle: 'Back',       equipment: 'Cable',     type: 'isolation' },

  // ─── Shoulders ────────────────────────────────────────────────────────────────
  { id: 'ohp',                  name: 'Overhead Press',          muscle: 'Shoulders',  equipment: 'Barbell',   type: 'compound' },
  { id: 'db_ohp',               name: 'Dumbbell Shoulder Press', muscle: 'Shoulders',  equipment: 'Dumbbell',  type: 'compound' },
  { id: 'db_lateral_raise',     name: 'Dumbbell Lateral Raise',  muscle: 'Shoulders',  equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'cable_lateral_raise',  name: 'Cable Lateral Raise',     muscle: 'Shoulders',  equipment: 'Cable',     type: 'isolation' },
  { id: 'front_raise',          name: 'Front Raise',             muscle: 'Shoulders',  equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'rear_delt_fly',        name: 'Rear Delt Fly',           muscle: 'Shoulders',  equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'arnold_press',         name: 'Arnold Press',            muscle: 'Shoulders',  equipment: 'Dumbbell',  type: 'compound' },
  { id: 'upright_row',          name: 'Upright Row',             muscle: 'Shoulders',  equipment: 'Barbell',   type: 'compound' },
  { id: 'machine_shoulder_press',name: 'Machine Shoulder Press', muscle: 'Shoulders',  equipment: 'Machine',   type: 'compound' },
  { id: 'shrug',                name: 'Shrug',                   muscle: 'Shoulders',  equipment: 'Barbell',   type: 'isolation' },

  // ─── Arms — Biceps ────────────────────────────────────────────────────────────
  { id: 'barbell_curl',         name: 'Barbell Curl',            muscle: 'Biceps',     equipment: 'Barbell',   type: 'isolation' },
  { id: 'db_curl',              name: 'Dumbbell Curl',           muscle: 'Biceps',     equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'hammer_curl',          name: 'Hammer Curl',             muscle: 'Biceps',     equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'cable_curl',           name: 'Cable Curl',              muscle: 'Biceps',     equipment: 'Cable',     type: 'isolation' },
  { id: 'incline_db_curl',      name: 'Incline Dumbbell Curl',   muscle: 'Biceps',     equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'preacher_curl',        name: 'Preacher Curl',           muscle: 'Biceps',     equipment: 'Barbell',   type: 'isolation' },
  { id: 'concentration_curl',   name: 'Concentration Curl',      muscle: 'Biceps',     equipment: 'Dumbbell',  type: 'isolation' },

  // ─── Arms — Triceps ───────────────────────────────────────────────────────────
  { id: 'close_grip_bench',     name: 'Close-Grip Bench Press',  muscle: 'Triceps',    equipment: 'Barbell',   type: 'compound' },
  { id: 'tricep_pushdown',      name: 'Tricep Pushdown',         muscle: 'Triceps',    equipment: 'Cable',     type: 'isolation' },
  { id: 'skull_crusher',        name: 'Skull Crusher (EZ Bar)',  muscle: 'Triceps',    equipment: 'Barbell',   type: 'isolation' },
  { id: 'overhead_tricep_ext',  name: 'Overhead Tricep Extension',muscle: 'Triceps',   equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'tricep_dip',           name: 'Tricep Dip',              muscle: 'Triceps',    equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'kickback',             name: 'Tricep Kickback',         muscle: 'Triceps',    equipment: 'Dumbbell',  type: 'isolation' },

  // ─── Legs — Quads ─────────────────────────────────────────────────────────────
  { id: 'squat',                name: 'Barbell Back Squat',      muscle: 'Quads',      equipment: 'Barbell',   type: 'compound' },
  { id: 'front_squat',          name: 'Front Squat',             muscle: 'Quads',      equipment: 'Barbell',   type: 'compound' },
  { id: 'leg_press',            name: 'Leg Press',               muscle: 'Quads',      equipment: 'Machine',   type: 'compound' },
  { id: 'hack_squat',           name: 'Hack Squat',              muscle: 'Quads',      equipment: 'Machine',   type: 'compound' },
  { id: 'leg_extension',        name: 'Leg Extension',           muscle: 'Quads',      equipment: 'Machine',   type: 'isolation' },
  { id: 'walking_lunge',        name: 'Walking Lunge',           muscle: 'Quads',      equipment: 'Dumbbell',  type: 'compound' },
  { id: 'goblet_squat',         name: 'Goblet Squat',            muscle: 'Quads',      equipment: 'Dumbbell',  type: 'compound' },
  { id: 'bulgarian_split',      name: 'Bulgarian Split Squat',   muscle: 'Quads',      equipment: 'Dumbbell',  type: 'compound' },

  // ─── Legs — Hamstrings ────────────────────────────────────────────────────────
  { id: 'rdl',                  name: 'Romanian Deadlift',        muscle: 'Hamstrings', equipment: 'Barbell',   type: 'compound' },
  { id: 'leg_curl',             name: 'Lying Leg Curl',           muscle: 'Hamstrings', equipment: 'Machine',   type: 'isolation' },
  { id: 'seated_leg_curl',      name: 'Seated Leg Curl',          muscle: 'Hamstrings', equipment: 'Machine',   type: 'isolation' },
  { id: 'nordic_curl',          name: 'Nordic Curl',              muscle: 'Hamstrings', equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'sumo_deadlift',        name: 'Sumo Deadlift',            muscle: 'Hamstrings', equipment: 'Barbell',   type: 'compound' },

  // ─── Legs — Glutes ────────────────────────────────────────────────────────────
  { id: 'hip_thrust',           name: 'Barbell Hip Thrust',       muscle: 'Glutes',     equipment: 'Barbell',   type: 'compound' },
  { id: 'glute_bridge',         name: 'Glute Bridge',             muscle: 'Glutes',     equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'cable_kickback',       name: 'Cable Glute Kickback',     muscle: 'Glutes',     equipment: 'Cable',     type: 'isolation' },
  { id: 'abductor_machine',     name: 'Hip Abductor Machine',     muscle: 'Glutes',     equipment: 'Machine',   type: 'isolation' },

  // ─── Legs — Calves ────────────────────────────────────────────────────────────
  { id: 'calf_raise',           name: 'Standing Calf Raise',      muscle: 'Calves',     equipment: 'Machine',   type: 'isolation' },
  { id: 'seated_calf_raise',    name: 'Seated Calf Raise',        muscle: 'Calves',     equipment: 'Machine',   type: 'isolation' },
  { id: 'donkey_calf_raise',    name: 'Donkey Calf Raise',        muscle: 'Calves',     equipment: 'Machine',   type: 'isolation' },

  // ─── Core ─────────────────────────────────────────────────────────────────────
  { id: 'plank',                name: 'Plank',                    muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'crunch',               name: 'Crunch',                   muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'hanging_leg_raise',    name: 'Hanging Leg Raise',        muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'ab_rollout',           name: 'Ab Wheel Rollout',         muscle: 'Core',       equipment: 'Other',     type: 'bodyweight' },
  { id: 'russian_twist',        name: 'Russian Twist',            muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'cable_crunch',         name: 'Cable Crunch',             muscle: 'Core',       equipment: 'Cable',     type: 'isolation' },
  { id: 'decline_crunch',       name: 'Decline Crunch',           muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'side_plank',           name: 'Side Plank',               muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'bicycle_crunch',       name: 'Bicycle Crunch',           muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'v_up',                 name: 'V-Up',                     muscle: 'Core',       equipment: 'Bodyweight',type: 'bodyweight' },

  // ─── Full Body / Olympic ─────────────────────────────────────────────────────
  { id: 'power_clean',          name: 'Power Clean',              muscle: 'Full Body',  equipment: 'Barbell',   type: 'compound' },
  { id: 'hang_clean',           name: 'Hang Clean',               muscle: 'Full Body',  equipment: 'Barbell',   type: 'compound' },
  { id: 'thruster',             name: 'Thruster',                 muscle: 'Full Body',  equipment: 'Barbell',   type: 'compound' },
  { id: 'kettlebell_swing',     name: 'Kettlebell Swing',         muscle: 'Full Body',  equipment: 'Kettlebell',type: 'compound' },
  { id: 'clean_and_press',      name: 'Clean and Press',          muscle: 'Full Body',  equipment: 'Barbell',   type: 'compound' },
  { id: 'burpee',               name: 'Burpee',                   muscle: 'Full Body',  equipment: 'Bodyweight',type: 'bodyweight' },

  // ─── Cardio ───────────────────────────────────────────────────────────────────
  { id: 'treadmill_run',        name: 'Treadmill Run',            muscle: 'Cardio',     equipment: 'Machine',   type: 'cardio' },
  { id: 'elliptical',           name: 'Elliptical',               muscle: 'Cardio',     equipment: 'Machine',   type: 'cardio' },
  { id: 'rowing_machine',       name: 'Rowing Machine',           muscle: 'Cardio',     equipment: 'Machine',   type: 'cardio' },
  { id: 'jump_rope',            name: 'Jump Rope',                muscle: 'Cardio',     equipment: 'Other',     type: 'cardio' },
  { id: 'stair_climber',        name: 'Stair Climber',            muscle: 'Cardio',     equipment: 'Machine',   type: 'cardio' },
  { id: 'cycling',              name: 'Stationary Bike',          muscle: 'Cardio',     equipment: 'Machine',   type: 'cardio' },
  { id: 'jump_squat',           name: 'Jump Squat',               muscle: 'Cardio',     equipment: 'Bodyweight',type: 'cardio' },

  // ─── Extra isolation ─────────────────────────────────────────────────────────
  { id: 'wrist_curl',           name: 'Wrist Curl',               muscle: 'Forearms',   equipment: 'Barbell',   type: 'isolation' },
  { id: 'reverse_curl',         name: 'Reverse Curl',             muscle: 'Forearms',   equipment: 'Barbell',   type: 'isolation' },
  { id: 'good_morning',         name: 'Good Morning',             muscle: 'Hamstrings', equipment: 'Barbell',   type: 'compound' },
  { id: 'hyperextension',       name: 'Hyperextension',           muscle: 'Back',       equipment: 'Machine',   type: 'isolation' },
  { id: 'step_up',              name: 'Step-Up',                  muscle: 'Quads',      equipment: 'Dumbbell',  type: 'compound' },
  { id: 'sissy_squat',          name: 'Sissy Squat',              muscle: 'Quads',      equipment: 'Bodyweight',type: 'bodyweight' },
  { id: 'spider_curl',          name: 'Spider Curl',              muscle: 'Biceps',     equipment: 'Barbell',   type: 'isolation' },
  { id: 'zottman_curl',         name: 'Zottman Curl',             muscle: 'Biceps',     equipment: 'Dumbbell',  type: 'isolation' },
  { id: 'pullover',             name: 'Dumbbell Pullover',        muscle: 'Back',       equipment: 'Dumbbell',  type: 'compound' },
  { id: 'chest_press_machine',  name: 'Chest Press Machine',      muscle: 'Chest',      equipment: 'Machine',   type: 'compound' },
  { id: 'seated_row_machine',   name: 'Seated Row Machine',       muscle: 'Back',       equipment: 'Machine',   type: 'compound' },
  { id: 'leg_press_calf',       name: 'Leg Press Calf Raise',     muscle: 'Calves',     equipment: 'Machine',   type: 'isolation' },
];

export const MUSCLE_GROUPS = [...new Set(EXERCISES.map((e) => e.muscle))].sort();

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e])
);
