const shots = (slug, items) => items.map(([file, alt]) => ({ src: `assets/img/${slug}/${file}.webp`, alt }));

export const projectsData = {
  'rideo': {
    title: 'RideO — Full-Stack Mobility Platform',
    tagline: 'A complete, end-to-end mobility ecosystem built for real-world reliability.',
    overview: 'A ride-based service needed an entire product ecosystem — admin control, a driver app, and a user app — all backed by a scalable REST API with separate databases, running in containers. I developed RideO as a complete ecosystem using a dual-database strategy and Docker containerization for rapid cloud deployment.',
    techStack: ['.NET 10', 'React', 'React Native', 'PostgreSQL', 'MongoDB', 'Docker', 'Node.js', 'Swagger'],
    features: [
      { title: 'Unified Product Sync', desc: 'Seamless experience connecting Admin web portal, Driver mobile app, and User mobile app for frictionless operations.' },
      { title: 'Dual-Database Strategy', desc: 'PostgreSQL for secure transactions, MongoDB for high-speed location and session tracking.' },
      { title: 'Cloud-Ready Infrastructure', desc: 'Full Docker containerization allows rapid deployment and simplified server management on any cloud.' },
      { title: 'High-Speed API Backbone', desc: 'A .NET 10 REST API ensuring low-latency communication across the entire ecosystem.' }
    ],
    images: shots('rideo', [
      ['01', 'RideO admin panel screen 1'],
      ['02', 'RideO admin panel screen 2'],
      ['03', 'RideO mobile app screen 1'],
      ['04', 'RideO mobile app screen 2'],
      ['05', 'RideO mobile app screen 3']
    ]),
    github: 'https://github.com/DeepB5155/RideO-FullStack-Mobility-Platform',
    live: null
  },
  'student-portal': {
    title: 'Student Portal — Enterprise Management System',
    tagline: 'A secure, centralized command center for professional academic operations.',
    overview: 'Academic institutions managed students, faculty, exams, and grades across scattered spreadsheets. I engineered a unified management system consolidating all academic workflows into a single, high-security platform with distinct role-based interfaces for Admin, Faculty, and Student users.',
    techStack: ['ASP.NET Core 10', 'OpenIddict (OAuth2)', 'Entity Framework Core', 'SQL Server', 'React 18', 'TypeScript', 'Vite', 'Tailwind CSS'],
    features: [
      { title: 'Multi-Role Governance', desc: 'Tailored dashboards for Admins, Faculty, and Students to streamline specific daily tasks and data access.' },
      { title: 'Digital Exam Workflow', desc: 'Complete module for exam creation, scheduling, and automated grade publishing to eliminate manual paperwork.' },
      { title: 'Enterprise-Grade Security', desc: 'Industry-standard OAuth2 protocols ensure total control over sensitive student data and user sessions.' },
      { title: 'Real-Time Grade Tracking', desc: 'Faculty enter and verify marks instantly, providing students with immediate, transparent performance feedback.' }
    ],
    images: shots('student-portal', [
      ['01', 'Student Portal new user awaiting approval'],
      ['02', 'Admin approving new user access'],
      ['03', 'Admin assigning subjects to faculty'],
      ['04', 'Admin managing exams'],
      ['05', 'Admin managing subjects'],
      ['06', 'Admin profile'],
      ['07', 'Faculty grading students'],
      ['08', 'Faculty activity log'],
      ['09', 'Faculty profile'],
      ['10', 'Student subject selection'],
      ['11', 'Student subject marks']
    ]),
    github: 'https://github.com/DeepB5155/StudentPortal-Pro',
    live: null
  },
  'apnadhaba': {
    title: 'ApnaDhaba — Modern Food Ordering System',
    tagline: 'A production-ready food ordering ecosystem built for security, speed, and sales.',
    overview: 'Businesses needed a professional food ordering platform with secure login, cart management for guest and registered users, address handling, and full order tracking — in a clean production architecture. I built ApnaDhaba with a decoupled .NET 10 API (identity, RBAC, addresses) and a user-facing MVC storefront (menu, cart, orders, payment simulation).',
    techStack: ['ASP.NET Core 10', 'ASP.NET Core MVC', 'Web API', 'Entity Framework Core', 'SQL Server', 'JWT', 'Bootstrap 5', 'JavaScript'],
    features: [
      { title: 'Dual-Flow Cart Logic', desc: 'Allows both guests and registered users to build orders seamlessly, significantly increasing checkout completion rates.' },
      { title: 'Secure JWT Authentication', desc: 'Industry-standard security protecting user accounts and sensitive transaction data end-to-end.' },
      { title: 'Order Lifecycle Tracking', desc: 'Real-time status updates from Placed to Delivered, giving customers full transparency and reducing support requests.' },
      { title: 'Dynamic Menu Control', desc: 'Intuitive interface for business owners to update prices, categories, and item availability instantly.' }
    ],
    images: shots('apnadhaba', [
      ['01', 'ApnaDhaba login page'],
      ['02', 'ApnaDhaba payment confirmation screen'],
      ['03', 'ApnaDhaba payment page'],
      ['04', 'ApnaDhaba user profile page'],
      ['05', 'ApnaDhaba screenshot 5'],
      ['06', 'ApnaDhaba screenshot 6'],
      ['07', 'ApnaDhaba screenshot 7']
    ]),
    github: 'https://github.com/DeepB5155/ApnaDhaba-Food-Ordering-System',
    live: null
  },
  'logic-sim': {
    title: 'WebLogic 2D — Premium Logic Circuit Simulator',
    tagline: 'Near-native performance for complex logic simulation, delivered entirely in the browser.',
    overview: 'Students and engineers needed a lightweight yet powerful tool for accurate logic evaluations without local installations. I built a custom evaluation engine in C compiled to WebAssembly, paired with a clean HTML5 Canvas UI that remains responsive even as circuit complexity increases.',
    techStack: ['C', 'WebAssembly (Emscripten)', 'Vanilla JavaScript', 'HTML5 Canvas', 'CSS3'],
    features: [
      { title: 'WebAssembly Core Engine', desc: 'Delivers lightning-fast logic evaluation by running compiled C code directly in the browser — no plugins needed.' },
      { title: 'High-Fidelity Canvas UI', desc: 'Responsive drag-and-drop canvas with smart wiring and grid snapping for a professional design experience.' },
      { title: 'Advanced Visualization', desc: 'Real-time oscilloscope views and automatic truth table generation to debug complex circuits visually.' },
      { title: 'Blueprint Export', desc: 'Save circuit designs as high-resolution PNG images for documentation or academic use instantly.' }
    ],
    images: shots('logic-sim', [
      ['01', 'WebLogic 2D simulator screenshot 1'],
      ['02', 'WebLogic 2D simulator screenshot 2'],
      ['03', 'WebLogic 2D simulator screenshot 3'],
      ['04', 'WebLogic 2D simulator screenshot 4'],
      ['05', 'WebLogic 2D simulator screenshot 5']
    ]),
    github: 'https://github.com/DeepB5155/Logic-Circuit-Simulator',
    live: null
  },
  'kidswear': {
    title: 'Full-Stack E-commerce Platform',
    tagline: 'A complete, subscription-free retail ecosystem designed for total business ownership.',
    overview: 'A retail business needed a professional online store without Shopify fees — combining a customer shopping experience with a powerful admin panel. I built a dual-panel system with custom PDF invoicing and automated email notifications, delivering a high-end retail experience without expensive plugins.',
    techStack: ['React 19', 'Vite', 'Vanilla CSS', 'Node.js', 'Express.js', 'SQLite3', 'JWT', 'Google OAuth', 'Nodemailer', 'jsPDF', 'Multer'],
    features: [
      { title: 'Dual-Panel Architecture', desc: 'Separate specialized interfaces for customer shopping and admin business management to streamline operations.' },
      { title: 'Social & Secure Login', desc: 'Google OAuth and JWT provide users a fast one-click login experience while keeping data fully secure.' },
      { title: 'Automated Sales Workflow', desc: 'Auto-generates professional PDF invoices and sends email alerts to both customer and store owner on every purchase.' },
      { title: 'Total Inventory Control', desc: 'Centralized admin dashboard for real-time tracking of product stock, order status, and customer activity.' }
    ],
    images: shots('kidswear', [
      ['09', 'Kidswear customer storefront'],
      ['08', 'Kidswear customer account view'],
      ['01', 'Kidswear admin panel screen 1'],
      ['02', 'Kidswear admin panel screen 2'],
      ['03', 'Kidswear admin panel screen 3'],
      ['04', 'Kidswear admin panel screen 4'],
      ['05', 'Kidswear admin panel screen 5'],
      ['06', 'Kidswear admin panel screen 6'],
      ['07', 'Kidswear admin panel screen 7']
    ]),
    github: 'https://github.com/DeepB5155/kidswear_e-commerce-platform',
    live: null
  }
};
