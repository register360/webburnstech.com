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
    
    // Form validation and submission
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
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
            
            if (!isValid) return;
            
            // Create form data object
            const formData = {
                name: name.value.trim(),
                email: email.value.trim(),
                subject: document.getElementById('subject').value.trim(),
                message: message.value.trim()
            };
            // Get submit button and store original text
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML; // Store original content
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                // Send to server
                const response = await fetch('https://webburnstech-com.onrender.com/submit-form', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Success
                    const successMsg = document.createElement('div');
                    successMsg.className = 'form-success';
                    successMsg.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        <p>${result.message || 'Thank you! Your message has been sent.'}</p>
                    `;
                    contactForm.parentNode.insertBefore(successMsg, contactForm.nextSibling);
                    contactForm.reset();
                    
                    // Remove success message after 5 seconds
                    setTimeout(() => {
                        successMsg.remove();
                    }, 5000);
                } else {
                    // Server error
                    throw new Error(result.message || 'Failed to send message');
                }
            } catch (error) {
                // Network or other errors
                const errorMsg = document.createElement('div');
                errorMsg.className = 'form-error';
                errorMsg.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${error.message || 'Network error. Please try again later.'}</p>
                `;
                contactForm.parentNode.insertBefore(errorMsg, contactForm.nextSibling);
                
                // Remove error message after 5 seconds
                setTimeout(() => {
                    errorMsg.remove();
                }, 5000);
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
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
document.addEventListener('DOMContentLoaded', function() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiChat = document.getElementById('aiAssistant');
    const closeBtn = document.getElementById('aiCloseBtn');
    const messagesContainer = document.getElementById('aiMessages');
    const userInput = document.getElementById('aiUserInput');
    const sendBtn = document.getElementById('aiSendBtn');
    
    // Backend API URL
    const API_URL = 'https://ai-assistant-z37c.onrender.com/api/ai-assistant';
    
    // Open/close chat
    aiBtn.addEventListener('click', () => {
        aiChat.classList.toggle('active');
        if (aiChat.classList.contains('active')) {
            if (messagesContainer.children.length === 0) {
                addMessage('ai', "Hi! I'm Webburns Assistant. How can I help you today?");
            }
            userInput.focus();
        }
    });
    
    closeBtn.addEventListener('click', () => {
        aiChat.classList.remove('active');
    });
    
    // Send message
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        addMessage('user', message);
        userInput.value = '';
        setLoadingState(true);
        
        try {
            const response = await fetch('https://ai-assistant-z37c.onrender.com/api/ai-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.reply) {
                throw new Error('Empty response from server');
            }
            
            addMessage('ai', data.reply);
            
        } catch (error) {
            console.error('API Error:', error);
            addMessage('ai', getErrorMessage(error));
        } finally {
            setLoadingState(false);
        }
    }
    
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function setLoadingState(isLoading) {
        if (isLoading) {
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'message ai-message typing-indicator';
            typingIndicator.id = 'typing-indicator';
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            messagesContainer.appendChild(typingIndicator);
        } else {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) messagesContainer.removeChild(indicator);
        }
        
        userInput.disabled = isLoading;
        sendBtn.disabled = isLoading;
        if (!isLoading) userInput.focus();
    }
    
    function getErrorMessage(error) {
        // Customize error messages based on error type
        if (error.message.includes('Failed to fetch')) {
            return "Connection failed. Please check your network and try again.";
        } else if (error.message.includes('Server returned')) {
            return "Our servers are busy. Please try again in a moment.";
        } else {
            return "Sorry, I'm having trouble connecting. Please try again later.";
        }
    }
});
