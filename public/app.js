
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Checking your account...";
  message.style.color = "#8B7565";

  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
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
    message.style.color = "#496B4A";

    if (data.role === "admin") {
      window.location.href = "/admin-dashboard.html";
    } else if (data.role === "student") {
      window.location.href = "/student-dashboard.html";
    } else {
      throw new Error("Your account has an invalid role. Please contact the administrator.");
    }

  } catch (error) {
    message.textContent =
      error.message || "Unable to connect to the server.";

    message.style.color = "#A34B3F";

    submitButton.disabled = false;
  }
});
