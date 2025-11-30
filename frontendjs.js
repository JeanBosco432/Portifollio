
        // Menu Toggle for Mobile
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');

        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Header Scroll Effect
        const header = document.getElementById('header');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });

        // Fade-in Animation on Scroll
        const fadeElements = document.querySelectorAll('.fade-in');

        const fadeInOnScroll = () => {
            fadeElements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;
                
                if (elementTop < window.innerHeight - elementVisible) {
                    element.classList.add('visible');
                }
            });
        };

        window.addEventListener('scroll', fadeInOnScroll);
        window.addEventListener('load', fadeInOnScroll);

        // Smooth Scrolling for Anchor Links
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
                    
                    // Close mobile menu if open
                    if (navLinks.classList.contains('active')) {
                        navLinks.classList.remove('active');
                    }
                }
            });
        });

        // === FORMULAIRE D'AVIS : Simple et Lisible ===
        const stars = document.querySelectorAll('.star');
        const envoie = document.getElementById('envoie');
        const ratingInput = document.getElementById('review-rating');
        const reviewForm = document.getElementById('reviewForm');
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        const notificationClose = document.querySelector('.notification-close');

        // === FONCTION DE NOTIFICATION ===
        function afficherNotification(message, type = 'success') {
            // type: 'success', 'error', 'info'
            notificationText.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'flex';

            // Fermer après 5 secondes automatiquement
            setTimeout(() => {
                fermerNotification();
            }, 5000);
        }

        function fermerNotification() {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.style.display = 'none';
                notification.classList.remove('fade-out');
            }, 300);
        }

        // Bouton fermer la notification
        notificationClose.addEventListener('click', fermerNotification);

        // === GESTION DES ÉTOILES ===
        // Quand on clique sur une étoile, on met à jour la note
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = star.getAttribute('data-rating');
                ratingInput.value = rating;
                afficherEtoiles(rating);
            });

            // Au survol, on montre un aperçu
            star.addEventListener('mouseover', () => {
                const rating = star.getAttribute('data-rating');
                afficherEtoiles(rating);
            });
        });

        // Quand la souris quitte, on affiche la note sélectionnée
        document.querySelector('.star-rating').addEventListener('mouseleave', () => {
            afficherEtoiles(ratingInput.value);
        });

        // Fonction simple : affiche les étoiles jusqu'à la note donnée
        function afficherEtoiles(note) {
            stars.forEach(star => {
                const starRating = star.getAttribute('data-rating');
                if (starRating <= note) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }

        // === VALIDATION ET ENVOI DU FORMULAIRE ===
        envoie.addEventListener('click', (e) => {
            e.preventDefault();

            const nom = document.getElementById('review-name').value.trim();
            const email = document.getElementById('review-email').value.trim();
            const message = document.getElementById('review-text').value.trim();
            const note = ratingInput.value;

            // Vérifications simples
            if (!nom) {
                afficherNotification('❌ Veuillez entrer votre nom', 'error');
                return;
            }
            if (!email) {
                afficherNotification('❌ Veuillez entrer votre email', 'error');
                return;
            }
            if (!message) {
                afficherNotification('❌ Veuillez écrire votre avis', 'error');
                return;
            }
            if (!note || note < 1) {
                afficherNotification('❌ Veuillez sélectionner une note', 'error');
                return;
            }

            // Données à envoyer au backend
            
            // Afficher un message "en cours d'envoi"
            afficherNotification('⏳ Envoi en cours...', 'info');

            // Envoyer au backend
            fetch('http://localhost:3000/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({email:email,nom:nom,message:message,note:note}),

            })
            .then(response => {
                if (response.ok) {
                    // Succès
                    afficherNotification('✓ Merci ! Votre avis a été envoyé avec succès.', 'success');
                    
                    // Réinitialiser le formulaire
                    reviewForm.reset();
                    ratingInput.value = '0';
                    afficherEtoiles(0);
                } else {
                    // Erreur du serveur
                    afficherNotification('❌ Erreur lors de l\'envoi. Veuillez réessayer.', 'error');
                }
            })
            .catch((error) => {
                // Erreur réseau
                console.error('Erreur:', error);
                afficherNotification('❌ Erreur réseau. Vérifiez votre connexion.', 'error');
            });
        });
    