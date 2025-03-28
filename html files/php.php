<?php
// Start the session
session_start();

// Include database connection file
require_once 'config.php';

// Initialize variables
$username = $password = "";
$errors = [];

// Process the form when submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitize and validate inputs
    $username = trim($_POST["username"]);
    $password = trim($_POST["password"]);

    // Check if username and password are empty
    if (empty($username)) {
        $errors[] = "Please enter your username or email.";
    }
    if (empty($password)) {
        $errors[] = "Please enter your password.";
    }

    // If no errors, proceed to check credentials
    if (empty($errors)) {
        // Prepare a select statement
        $sql = "SELECT id, username, password FROM users WHERE username = ? OR email = ?";

        if ($stmt = mysqli_prepare($link, $sql)) {
            // Bind variables to the prepared statement
            mysqli_stmt_bind_param($stmt, "ss", $param_username, $param_username);

            // Set parameters
            $param_username = $username;

            // Execute the statement
            if (mysqli_stmt_execute($stmt)) {
                // Store result
                mysqli_stmt_store_result($stmt);

                // Check if username exists
                if (mysqli_stmt_num_rows($stmt) == 1) {
                    // Bind result variables
                    mysqli_stmt_bind_result($stmt, $id, $username, $hashed_password);
                    if (mysqli_stmt_fetch($stmt)) {
                        // Verify password
                        if (password_verify($password, $hashed_password)) {
                            // Password is correct, start a new session
                            session_start();

                            // Store data in session variables
                            $_SESSION["loggedin"] = true;
                            $_SESSION["id"] = $id;
                            $_SESSION["username"] = $username;

                            // Redirect user to welcome page
                            header("location: welcome.php");
                            exit;
                        } else {
                            // Display an error for invalid password
                            $errors[] = "Invalid username or password.";
                        }
                    }
                } else {
                    // Display an error for invalid username
                    $errors[] = "Invalid username or password.";
                }
            } else {
                echo "Oops! Something went wrong. Please try again later.";
            }
            // Close statement
            mysqli_stmt_close($stmt);
        }
    }
    // Close connection
    mysqli_close($link);
}
?>
