const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
function tologinpage(){
    window.location.href = 'login.html';
}
function tosignuppage(){
    window.location.href = 'signup.html';
}
loginButton.addEventListener('click',tologinpage)
signupButton.addEventListener('click',tosignuppage)
