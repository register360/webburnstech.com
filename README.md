<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webburns_Tech</title>
    <link rel="stylesheet" href="base.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=Orbitron:wght@400;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"></script>
</head>
<body>
    <!-- Theme Toggle -->
    <div class="theme-toggle">
        <i class="fas fa-moon"></i>
        <i class="fas fa-sun"></i>
    </div>

    <!-- Navigation -->
    <nav class="navbar">
        <div class="container">
            <a href="#" class="logo">Webburns<span>Tech</span></a>
            <div class="nav-links">
                <a href="#home">Home</a>
                <a href="#about">About</a>
                <a href="#services">Services</a>
                <a href="#portfolio">Portfolio</a>
                <a href="#contact">Contact</a>
            </div>
            <div class="hamburger">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="home" class="hero">
        <div class="video-background">
            <video autoplay muted loop  width="513" height="816" style="width: 100%; height: 100%;">
                <source src="videos/video_4.mp4" type="video/mp4">
            </video>
            <div class="overlay"></div>
        </div>
        <div id="particles-js"></div>
        <div class="container">
            <h1 class="hero-title">Building the Future <span>of the Web Today</span></h1>
            <p class="hero-subtitle">Next-generation web solutions for tomorrow's digital landscape</p>
            <div class="cta-buttons">
                <a href="#contact" class="btn btn-primary">Get Started</a>
                <a href="#portfolio" class="btn btn-secondary">Our Work</a>
            </div>
            <div class="scroll-down">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section id="about" class="about">
        <div class="container">
            <div class="section-header">
                <h2>About Us</h2>
                <p>Innovation at the core of everything we do</p>
            </div>
            <div class="about-content">
                <div class="about-text">
                    <p>We are a next-generation web development company passionate about creating immersive, scalable, and powerful digital experiences. Our team combines creativity, technology, and strategy to bring your ideas to life through state-of-the-art web solutions. From concept to code, we believe in delivering excellence with a futuristic vision.</p>
                    <div class="stats">
                        <div class="stat-item">
                            <h3 data-count="150">0</h3>
                            <p>Projects Completed</p>
                        </div>
                        <div class="stat-item">
                            <h3 data-count="98">0</h3>
                            <p>Client Satisfaction</p>
                        </div>
                        <div class="stat-item">
                            <h3 data-count="12">0</h3>
                            <p>Awards Won</p>
                        </div>
                    </div>
                </div>
                <div class="about-image">
                    <div class="image-wrapper">
                        <img src="images/tech-bg.png" alt="Our workspace">
                        <div class="glow"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Team Section -->
    <section class="team">
        <div class="container">
            <div class="section-header">
                <h2>Our Team</h2>
                <p>The minds behind the innovation</p>
            </div>
            <div class="team-members">
                <div class="member">
                    <div class="member-image">
                        <img src="images/vinay.jpeg" alt="Team Member">
                        <div class="social-links">
                            <a href="#"><i class="fab fa-linkedin"></i></a>
                            <a href="#"><i class="fab fa-twitter"></i></a>
                            <a href="https://register360.github.io/webburnstech.com/" target="_blank"><i class="fab fa-github"></i></a>
                        </div>
                    </div>
                    <h3>T Vinay</h3>
                    <p>Lead Developer</p>
                </div>
                <div class="member">
                    <div class="member-image">
                        <img src="images/pavan.jpeg" alt="Team Member">
                        <div class="social-links">
                            <a href="#"><i class="fab fa-linkedin"></i></a>
                            <a href="#"><i class="fab fa-twitter"></i></a>
                            <a href="https://www.instagram.com/pavanknani1/" target="_blank"><i class="fab fa-instagram"></i></a>
                        </div>
                    </div>
                    <h3>Pavan Nani</h3>
                    <p>UI/UX Designer</p>
                </div>
                <div class="member">
                    <div class="member-image">
                        <img src="images/sunny.jpeg" alt="Team Member">
                        <div class="social-links">
                            <a href="#"><i class="fab fa-linkedin"></i></a>
                            <a href="#"><i class="fab fa-twitter"></i></a>
                            <a href="#"><i class="fab fa-instagram"></i></a>
                        </div>
                    </div>
                    <h3>Sunny Kiran</h3>
                    <p>Project Manager</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="services">
        <div class="container">
            <div class="section-header">
                <h2>Our Services</h2>
                <p>Comprehensive solutions for your digital needs</p>
            </div>
            <div class="services-grid">
                <div class="service-card">
                    <div class="service-icon">
                        <i class="fas fa-code"></i>
                    </div>
                    <h3>Front-End Development</h3>
                    <p>Modern, responsive interfaces built with React, Vue, and cutting-edge CSS frameworks.</p>
                    <a href="#" class="read-more">Learn more <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="service-card">
                    <div class="service-icon">
                        <i class="fas fa-server"></i>
                    </div>
                    <h3>Back-End Development</h3>
                    <p>Scalable server architecture with Node.js, Python, and cloud solutions.</p>
                    <a href="#" class="read-more">Learn more <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="service-card">
                    <div class="service-icon">
                        <i class="fas fa-paint-brush"></i>
                    </div>
                    <h3>UI/UX Design</h3>
                    <p>User-centered designs that combine aesthetics with seamless functionality.</p>
                    <a href="#" class="read-more">Learn more <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="service-card">
                    <div class="service-icon">
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                    <h3>Mobile Development</h3>
                    <p>Cross-platform mobile apps with React Native and Flutter.</p>
                    <a href="#" class="read-more">Learn more <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="service-card">
                    <div class="service-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3>SEO Optimization</h3>
                    <p>Increase visibility and drive organic traffic to your digital properties.</p>
                    <a href="#" class="read-more">Learn more <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="service-card">
                    <div class="service-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>Digital Strategy</h3>
                    <p>Comprehensive plans to maximize your online presence and ROI.</p>
                    <a href="#" class="read-more">Learn more <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        </div>
    </section>

    <!-- Portfolio Section -->
    <section id="portfolio" class="portfolio">
        <div class="container">
            <div class="section-header">
                <h2>Our Portfolio</h2>
                <p>Showcase of our recent projects</p>
            </div>
            <div class="portfolio-filter">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="web">Web</button>
                <button class="filter-btn" data-filter="mobile">Mobile</button>
                <button class="filter-btn" data-filter="design">Design</button>
            </div>
            <div class="portfolio-grid">
                <div class="portfolio-item" data-category="web">
                    <img src="images/project_1.png" alt="Project 1">
                    <div class="portfolio-overlay">
                        <h3>Quantum Dashboard</h3>
                        <p>Analytics platform for financial data</p>
                        <a href="#" class="view-project">View Project</a>
                    </div>
                </div>
                <div class="portfolio-item" data-category="mobile">
                    <img src="images/project_2.png" alt="Project 2">
                    <div class="portfolio-overlay">
                        <h3>Nexus Fitness App</h3>
                        <p>AI-powered workout companion</p>
                        <a href="#" class="view-project">View Project</a>
                    </div>
                </div>
                <div class="portfolio-item" data-category="design">
                    <img src="images/project_3.png" alt="Project 3">
                    <div class="portfolio-overlay">
                        <h3>Cyberpunk Branding</h3>
                        <p>Visual identity for tech startup</p>
                        <a href="#" class="view-project">View Project</a>
                    </div>
                </div>
                <div class="portfolio-item" data-category="web">
                    <img src="images/project_4.png" alt="Project 4">
                    <div class="portfolio-overlay">
                        <h3>Blockchain Explorer</h3>
                        <p>Cryptocurrency transaction tracker</p>
                        <a href="#" class="view-project">View Project</a>
                    </div>
                </div>
                <div class="portfolio-item" data-category="mobile">
                    <img src="images/project_5.png" alt="Project 5">
                    <div class="portfolio-overlay">
                        <h3>AR City Guide</h3>
                        <p>Augmented reality navigation</p>
                        <a href="#" class="view-project">View Project</a>
                    </div>
                </div>
                <div class="portfolio-item" data-category="design">
                    <img src="images/project_6.png" alt="Project 6">
                    <div class="portfolio-overlay">
                        <h3>Futuristic UI Kit</h3>
                        <p>Design system for web apps</p>
                        <a href="#" class="view-project">View Project</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials">
        <div class="container">
            <div class="section-header">
                <h2>Client Testimonials</h2>
                <p>What our clients say about us</p>
            </div>
            <div class="testimonial-slider">
                <div class="testimonial-slide active">
                    <div class="testimonial-content">
                        <div class="quote-icon">
                            <i class="fas fa-quote-left"></i>
                        </div>
                        <p>"Webburns Tech transformed our online presence with their innovative approach. Their team delivered beyond our expectations with a website that perfectly captures our brand's futuristic vision."</p>
                        <div class="client-info">
                            <h4>Jennifer K.</h4>
                            <p>CEO, TechVision Inc.</p>
                        </div>
                    </div>
                </div>
                <div class="testimonial-slide">
                    <div class="testimonial-content">
                        <div class="quote-icon">
                            <i class="fas fa-quote-left"></i>
                        </div>
                        <p>"The mobile app developed by Webburns Tech has been a game-changer for our business. Their attention to detail and user experience focus resulted in a product our customers love."</p>
                        <div class="client-info">
                            <h4>David M.</h4>
                            <p>Founder, UrbanFit</p>
                        </div>
                    </div>
                </div>
                <div class="testimonial-slide">
                    <div class="testimonial-content">
                        <div class="quote-icon">
                            <i class="fas fa-quote-left"></i>
                        </div>
                        <p>"Working with Webburns Tech was a seamless experience. They understood our complex requirements and delivered a scalable solution that has grown with our business needs."</p>
                        <div class="client-info">
                            <h4>Sarah L.</h4>
                            <p>CTO, DataSphere</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="slider-controls">
                <button class="slider-prev"><i class="fas fa-chevron-left"></i></button>
                <div class="slider-dots">
                    <span class="dot active"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <button class="slider-next"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="contact">
        <div class="container">
            <div class="section-header">
                <h2>Contact Us</h2>
                <p>Let's build something amazing together</p>
            </div>
            <div class="contact-content">
                <div class="contact-info">
                    <div class="info-item">
                        <div class="info-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="info-text">
                            <h3>Location</h3>
                            <p>123 Tech Avenue, Silicon Valley, CA 94025</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="info-text">
                            <h3>Email</h3>
                            <p>Webburns@tech.dev</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">
                            <i class="fas fa-phone"></i>
                        </div>
                        <div class="info-text">
                            <h3>Phone</h3>
                            <p>+91 (555) 123-4567</p>
                        </div>
                    </div>
                    <div class="social-media">
                        <a href="#"><i class="fab fa-facebook-f"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-linkedin-in"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="https://register360.github.io/webburnstech.com/"><i class="fab fa-github"></i></a>
                    </div>
                </div>
                <div class="contact-form">
                    <form id="contactForm">
                        <div class="form-group">
                            <input type="text" id="name" name="name" placeholder="Your Name" required>
                        </div>
                        <div class="form-group">
                            <input type="email" id="email" name="email" placeholder="Your Email" required>
                        </div>
                        <div class="form-group">
                            <input type="text" id="subject" name="subject" placeholder="Subject">
                        </div>
                        <div class="form-group">
                            <textarea id="message" name="message" placeholder="Your Message" required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Send Message</button>
                    </form>
                </div>
            </div>
        </div>
        <div class="map-container">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.263031953117!2d78.5570383148769!3d17.4482999880448!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb9a1a5e862d51%3A0x6c08e7b3b5e6b1b4!2sLB%20Nagar%2C%20Hyderabad%2C%20Telangana!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-about">
                    <a href="#" class="logo">Webburns<span>Tech</span></a>
                    <p>Pushing the boundaries of web technology to create immersive digital experiences that shape the future.</p>
                </div>
                <div class="footer-links">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#about">About</a></li>
                        <li><a href="#services">Services</a></li>
                        <li><a href="#portfolio">Portfolio</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                </div>
                <div class="footer-services">
                    <h3>Services</h3>
                    <ul>
                        <li><a href="#">Web Development</a></li>
                        <li><a href="#">Mobile Development</a></li>
                        <li><a href="#">UI/UX Design</a></li>
                        <li><a href="#">SEO Optimization</a></li>
                        <li><a href="#">Digital Strategy</a></li>
                    </ul>
                </div>
                <div class="footer-newsletter">
                    <h3>Newsletter</h3>
                    <p>Subscribe to our newsletter for the latest updates.</p>
                    <form id="newsletterForm">
                        <input type="email" placeholder="Your Email" required>
                        <button type="submit"><i class="fas fa-paper-plane"></i></button>
                    </form>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2023 Webburns Tech. All Rights Reserved.</p>
                <div class="legal-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                    <a href="#">Cookies Policy</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- Back to Top Button -->
    <a href="#home" class="back-to-top">
        <i class="fas fa-arrow-up"></i>
    </a>

    <!-- Scripts -->
     <script>
        document.addEventListener('DOMContentLoaded', function() {
             const videoSources=["video_1.mp4","video_2.mp4","video_3.mp4","video_4.mp4","video_5.mp4"];
            });
     </script>
    <script src="js/particles.js"></script>
    <script src="base.js"></script>
</body>
</html>
