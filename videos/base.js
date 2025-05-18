document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;
    
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // Apply the saved theme
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
    }
    
    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme')) {
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    });
    
    // Mobile Navigation
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
    
    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Back to Top Button
    const backToTopBtn = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('active');
        } else {
            backToTopBtn.classList.remove('active');
        }
    });
    
    // Animate stats counter
    const statItems = document.querySelectorAll('.stat-item h3');
    
    function animateStats() {
        statItems.forEach(item => {
            const target = parseInt(item.getAttribute('data-count'));
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;
            
            const updateCounter = () => {
                current += step;
                if (current < target) {
                    item.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    item.textContent = target;
                }
            };
            
            updateCounter();
        });
    }
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('stats')) {
                    animateStats();
                }
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.stats, .service-card, .portfolio-item, .member').forEach(el => {
        observer.observe(el);
    });
    
    // Portfolio filtering
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter items
            const filter = button.getAttribute('data-filter');
            
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.getAttribute('data-category') === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
    
    // Testimonial slider
    const testimonialSlides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    let currentSlide = 0;
    
    function showSlide(index) {
        testimonialSlides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        testimonialSlides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    }
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });
    
    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + testimonialSlides.length) % testimonialSlides.length;
        showSlide(currentSlide);
    });
    
    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % testimonialSlides.length;
        showSlide(currentSlide);
    });
    
    // Auto-advance slides
    setInterval(() => {
        currentSlide = (currentSlide + 1) % testimonialSlides.length;
        showSlide(currentSlide);
    }, 5000);
    
    // Form validation
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simple validation
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            const message = document.getElementById('message');
            let isValid = true;
            
            if (name.value.trim() === '') {
                name.style.borderColor = 'red';
                isValid = false;
            } else {
                name.style.borderColor = '#ddd';
            }
            
            if (email.value.trim() === '' || !email.value.includes('@')) {
                email.style.borderColor = 'red';
                isValid = false;
            } else {
                email.style.borderColor = '#ddd';
            }
            
            if (message.value.trim() === '') {
                message.style.borderColor = 'red';
                isValid = false;
            } else {
                message.style.borderColor = '#ddd';
            }
            
            if (isValid) {
                // In a real application, you would send the form data to a server here
                alert('Thank you for your message! We will get back to you soon.');
                contactForm.reset();
            }
        });
    }
    
    // Initialize particles.js
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 80,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#ffffff"
                },
                "shape": {
                    "type": "circle",
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    },
                    "polygon": {
                        "nb_sides": 5
                    }
                },
                "opacity": {
                    "value": 0.5,
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3,
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#ffffff",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 2,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": {
                        "enable": false,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "grab"
                    },
                    "onclick": {
                        "enable": true,
                        "mode": "push"
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 140,
                        "line_linked": {
                            "opacity": 1
                        }
                    },
                    "bubble": {
                        "distance": 400,
                        "size": 40,
                        "duration": 2,
                        "opacity": 8,
                        "speed": 3
                    },
                    "repulse": {
                        "distance": 200,
                        "duration": 0.4
                    },
                    "push": {
                        "particles_nb": 4
                    },
                    "remove": {
                        "particles_nb": 2
                    }
                }
            },
            "retina_detect": true
        });
    }
});