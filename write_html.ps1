$html = @'
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Your Name — Full-Stack Developer</title>
<meta name="description" content="Freelance full-stack developer building premium web apps, mobile apps, dashboards and MVPs for startups and businesses."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="css/reset.css"/>
<link rel="stylesheet" href="css/tokens.css"/>
<link rel="stylesheet" href="css/typography.css"/>
<link rel="stylesheet" href="css/animations.css"/>
<link rel="stylesheet" href="css/components.css"/>
<link rel="stylesheet" href="css/layout.css"/>
<link rel="stylesheet" href="css/theme.css"/>
<link rel="stylesheet" href="css/responsive.css"/>
<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
</head>
<body>
'@
Set-Content -Path "index.html" -Value $html -Encoding UTF8
Write-Host "Part 1 written"
