<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login to Your Account</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>

<div class="login-container">
    <h1>Welcome Back</h1>
    <form action="login_process.php" method="POST">
        <div class="input-group">
            <label for="username">Username or Email</label>
            <input type="text" id="username" name="username" placeholder="Enter your username or email" required>
        </div>
        <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required>
        </div>
        <div class="forgot-password">
            <a href="#">Forgot your password?</a>
        </div>
        <button type="submit">Login</button>
    </form>
    <p class="signup-text">Don't have an account? <a href="signup.html">Sign up</a></p>
</div>

</body>
</html>
/* Reset some basic elements */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Body styling */
body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background-image: linear-gradient(to right, #8360c3, #2ebf91);
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

/* Container for the form */
.login-container {
    background-color: #ffffff;
    padding: 40px 50px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    width: 400px;
    text-align: center;
}

/* Heading */
.login-container h1 {
    margin-bottom: 30px;
    color: #333333;
}

/* Input groups */
.input-group {
    margin-bottom: 20px;
    text-align: left;
}

.input-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    color: #555555;
}

.input-group input {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #dddddd;
    border-radius: 4px;
    font-size: 16px;
}

.input-group input:focus {
    border-color: #2ebf91;
    outline: none;
}

/* Forgot password link */
.forgot-password {
    text-align: right;
    margin-bottom: 20px;
}

.forgot-password a {
    color: #2ebf91;
    text-decoration: none;
    font-size: 14px;
}

.forgot-password a:hover {
    text-decoration: underline;
}

/* Submit button */
button[type="submit"] {
    width: 100%;
    padding: 15px;
    background-color: #2ebf91;
    border: none;
    border-radius: 4px;
    color: #ffffff;
    font-size: 18px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

button[type="submit"]:hover {
    background-color: #279978;
}

/* Sign-up text */
.signup-text {
    margin-top: 25px;
    color: #777777;
    font-size: 15px;
}

.signup-text a {
    color: #8360c3;
    text-decoration: none;
    font-weight: bold;
}

.signup-text a:hover {
    text-decoration: underline;
}
