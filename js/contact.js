export function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const btn = form.querySelector('button[type="submit"]');
  const inputs = form.querySelectorAll('input[required], textarea[required]');

  // Create error message elements
  inputs.forEach(input => {
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-msg';
    errorSpan.innerText = 'This field is required';
    input.parentNode.appendChild(errorSpan);

    // Clear error on input
    input.addEventListener('input', () => {
      input.parentNode.classList.remove('error');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Custom Validation
    let isValid = true;
    inputs.forEach(input => {
      if (!input.value.trim()) {
        input.parentNode.classList.add('error');
        isValid = false;
      } else {
        input.parentNode.classList.remove('error');
      }
    });

    if (!isValid) return;

    // Save original button text and disable it
    const originalText = btn.innerText;
    btn.innerText = 'Sending...';
    btn.disabled = true;

    // FormSubmit requires the /ajax/ URL for fetch requests
    const url = 'https://formspree.io/f/xojrkbjg';
    const formData = new FormData(form);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        // Success state
        btn.innerText = 'Message Sent Successfully!';
        btn.classList.add('success');
        form.reset();
        
        setTimeout(() => {
          btn.innerText = originalText;
          btn.disabled = false;
          btn.classList.remove('success');
        }, 5000);
      } else {
        throw new Error('Server returned an error');
      }
    } catch (err) {
      console.error('Form submission error:', err);
      btn.innerText = 'Error Sending. Try Again.';
      btn.classList.add('error');
      
      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.classList.remove('error');
      }, 4000);
    }
  });
}
