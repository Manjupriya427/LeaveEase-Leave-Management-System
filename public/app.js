
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Checking your account...";
  message.style.color = "#7868a8";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    message.textContent = data.message || "Login successful!";
    message.style.color = "green";

    if (data.role === "admin") {
      window.location.href = "/admin-dashboard.html";
    } else {
      window.location.href = "/student-dashboard.html";
    }
  } catch (error) {
    message.textContent =
      error.message || "Unable to connect to the server.";
    message.style.color = "#a04d63";
  }
});
