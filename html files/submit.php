<?php
// Collect user data
$name = $_POST['name'];
$email = $_POST['email'];
$phone = $_POST['phone'];
$message = $_POST['message'];

// Create HTML message
$html_message = "
<html>
<body>
    <h2>User Data</h2>
    <p>Name: $name</p>
    <p>Email: $email</p>
    <p>Phone: $phone</p>
    <p>Message: $message</p>
</body>
</html>
";

// Email configuration
$to_email = "vinayvivek955@gmail.com";
$subject = "User Data";
$from_email = "vinayvivek070@outlook.com";
$password = "Vinay123@#";

// Send email
$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: $from_email\r\n";

mail($to_email, $subject, $html_message, $headers);

echo "Email sent successfully!";
?>
