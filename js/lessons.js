// === Lessons Data ===
const lessons = {
  gcse: [
    {
      id: 'forces-motion',
      title: 'Forces and Motion ⚡🪐',
      steps: [
        {
          title: 'Introduction to Forces 🏋️‍♂️',
          content: `
<p>A force is a <strong>push or pull</strong> acting on an object. Forces can <strong>change the motion of an object</strong>, including its speed, direction, or shape.</p>
<p>Imagine pushing a shopping trolley. When you push, it moves forward. When you pull a rope, the rope tightens. These are examples of forces at work in everyday life.</p>
<img src="../images/force_push_box.png" alt="Pushing a box" style="width:100%;max-width:400px;">
<video controls src="../videos/what_is_force.mp4" style="width:100%; max-width:500px;"></video>
<p><em>Activity:</em> Can you spot 3 forces around you right now?</p>
`
        },
        {
          title: 'Types of Forces 🌀',
          content: `
<p>Forces can be <strong>contact forces</strong> or <strong>non-contact forces</strong>. Common types:</p>
<ul>
  <li>Gravity (🌍) - Pulls objects toward Earth.</li>
  <li>Friction (🛹) - Opposes motion between surfaces.</li>
  <li>Tension (🪢) - Pull along a rope or string.</li>
  <li>Applied Force (💪) - Any push or pull you apply.</li>
</ul>
<img src="../images/types_of_forces.png" alt="Types of Forces" style="width:100%;max-width:400px;">
<video controls src="../videos/types_of_forces.mp4" style="width:100%; max-width:500px;"></video>
<p><em>Quiz:</em> Which force makes a ball stop rolling on grass?</p>
`
        },
        {
          title: 'Measuring Forces ⚖️',
          content: `
<p>Forces are measured in <strong>Newtons (N)</strong>. A <strong>force meter</strong> (spring scale) can measure the pull or push.</p>
<img src="../images/spring_scale.png" alt="Force Meter" style="width:100%;max-width:400px;">
<video controls src="../videos/force_meter.mp4" style="width:100%; max-width:500px;"></video>
<p>📏⚡ Try measuring a small object at home using a spring scale!</p>
`
        },
        {
          title: 'Balanced and Unbalanced Forces ⚖️🔴',
          content: `
<p><strong>Balanced forces:</strong> Forces cancel each other → object doesn’t move.</p>
<p><strong>Unbalanced forces:</strong> Forces do not cancel → object accelerates.</p>
<img src="../images/balanced_unbalanced.png" alt="Balanced vs Unbalanced Forces" style="width:100%;max-width:400px;">
<p>Interactive: Drag the forces to see the box move!</p>
`
        }
      ]
    }
  ],
  alevel: [
    {
      id: 'forces-motion-advanced',
      title: 'Forces and Motion – A-Level 🧪📐',
      steps: [
        {
          title: 'Vectors and Forces ➡️⬆️',
          content: `
<p>At A-Level, forces are treated as <strong>vectors</strong>. Each force has a <strong>magnitude</strong> and <strong>direction</strong>.</p>
<p>Vector addition is essential when multiple forces act on an object.</p>
<img src="../images/vector_forces.png" alt="Vector Forces" style="width:100%;max-width:400px;">
<video controls src="../videos/vector_forces.mp4" style="width:100%;max-width:500px;"></video>
`
        },
        {
          title: 'Equilibrium & Free Body Diagrams 📊',
          content: `
<p>Objects in equilibrium have <strong>net force = 0</strong>. We use <strong>free body diagrams (FBD)</strong> to visualize forces.</p>
<img src="../images/fbd.png" alt="Free Body Diagram" style="width:100%;max-width:400px;">
<video controls src="../videos/fbd.mp4" style="width:100%;max-width:500px;"></video>
`
        }
      ]
    }
  ],
  advanced: [
    {
      id: 'forces-motion-physics',
      title: 'Forces and Motion – Advanced Physics 🧬🔭',
      steps: [
        {
          title: 'Newtonian Mechanics & Calculus 🧮',
          content: `
<p>Advanced study involves using <strong>differential equations</strong> to model motion.</p>
<p>Example: F = m × a, where a = dv/dt. Integrate to find velocity and position.</p>
<img src="../images/advanced_newton.png" alt="Advanced Newtonian Mechanics" style="width:100%;max-width:400px;">
<video controls src="../videos/advanced_newton.mp4" style="width:100%;max-width:500px;"></video>
`
        },
        {
          title: 'Projectile Motion & Forces 🔫',
          content: `
<p>Combine horizontal and vertical forces to calculate trajectory.</p>
<p>Equations: x = v₀t cosθ, y = v₀t sinθ - ½ g t²</p>
<img src="../images/projectile_motion.png" alt="Projectile Motion" style="width:100%;max-width:400px;">
<video controls src="../videos/projectile_motion.mp4" style="width:100%;max-width:500px;"></video>
`
        }
      ]
    }
  ]
};

// === JS for Lesson Page ===
document.addEventListener('DOMContentLoaded', () => {
  const levelButtons = document.querySelectorAll('#level-select button');
  const lessonMenu = document.getElementById('lesson-menu');
  const lessonTitle = document.getElementById('lesson-title');
  const lessonSteps = document.getElementById('lesson-steps');
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');

  let currentLevel = null;
  let currentLesson = null;
  let currentStepIndex = 0;

  function renderLessonMenu(level) {
    lessonMenu.innerHTML = '';
    currentLevel = level;
    lessons[level].forEach((lesson, i) => {
      const btn = document.createElement('button');
      btn.textContent = lesson.title;
      btn.addEventListener('click', () => selectLesson(i));
      lessonMenu.appendChild(btn);
    });
  }

  function selectLesson(index) {
    currentLesson = lessons[currentLevel][index];
    currentStepIndex = 0;
    renderStep();
  }

  function renderStep() {
    if(!currentLesson) return;
    const step = currentLesson.steps[currentStepIndex];
    lessonTitle.textContent = step.title;
    lessonSteps.innerHTML = step.content;

    prevBtn.disabled = currentStepIndex === 0;
    nextBtn.disabled = currentStepIndex === currentLesson.steps.length - 1;
  }

  prevBtn.addEventListener('click', () => {
    if(currentStepIndex > 0) {
      currentStepIndex--;
      renderStep();
    }
  });

  nextBtn.addEventListener('click', () => {
    if(currentStepIndex < currentLesson.steps.length - 1) {
      currentStepIndex++;
      renderStep();
    }
  });

  levelButtons.forEach(btn => {
    btn.addEventListener('click', () => renderLessonMenu(btn.dataset.level));
  });
});
