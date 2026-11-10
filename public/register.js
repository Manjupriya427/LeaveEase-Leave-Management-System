const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const rollNumber = document.getElementById("rollNumber").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  message.textContent = "Creating your account...";
  message.style.color = "#7868a8";
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, rollNumber, email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Registration failed.");
    }
    message.textContent = "Registration successful! Redirecting to login...";
    message.style.color = "green";
    registerForm.reset();
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (error) {
    message.textContent = error.message || "Unable to connect to server.";
    message.style.color = "#a04d63";
  }
});