document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('subscribeForm');
    const messageDiv = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        
        try {
            const response = await fetch('/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
                messageDiv.textContent = data.message;
                messageDiv.className = 'message success';
                form.reset();
            } else {
                messageDiv.textContent = data.message;
                messageDiv.className = 'message error';
            }
        } catch (error) {
            messageDiv.textContent = 'An error occurred. Please try again later.';
            messageDiv.className = 'message error';
        }
    });
}); 