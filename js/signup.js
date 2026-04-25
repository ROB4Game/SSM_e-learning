

const countryCodeSelect = document.getElementById("ccode");

if (countryCodeSelect) {
    const options = Array.from(countryCodeSelect.options);

    options.forEach(function (option) {
        option.dataset.fullLabel = option.textContent.trim();
    });

    function showFullLabels() {
        options.forEach(function (option) {
            option.textContent = option.dataset.fullLabel;
        });
    }

    function showCompactSelectedLabel() {
        showFullLabels();
        const selectedOption = countryCodeSelect.options[countryCodeSelect.selectedIndex];

        if (selectedOption) {
            selectedOption.textContent = "+" + selectedOption.value;
        }
    }

    countryCodeSelect.addEventListener("mousedown", showFullLabels);
    countryCodeSelect.addEventListener("focus", showFullLabels);
    countryCodeSelect.addEventListener("change", showCompactSelectedLabel);
    countryCodeSelect.addEventListener("blur", showCompactSelectedLabel);

    showCompactSelectedLabel();
}

let usernameInput = document.getElementById("username");
let emailInput = document.getElementById("email");
let passwordInput = document.getElementById("password");
let phoneInput = document.getElementById("phone");
let ccodeSelect = document.getElementById("ccode");

const signupForm = document.querySelector(".signup-form");

const serverIP = "0.0.0.0";
const passwordRule = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const phoneLocalRule = /^\d{6,12}$/;

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const cleanedPhone = String(phoneInput.value).replace(/\D/g, "");
    const phoneNum = String(ccodeSelect.value) + cleanedPhone;

    if (!passwordRule.test(password)) {
        alert("Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.");
        return;
    }

    if (!phoneLocalRule.test(cleanedPhone)) {
        alert("Phone number must contain only digits and be between 6 and 12 digits.");
        return;
    }
    

    try{
        const res  = await fetch("http://"+serverIP+":4000/register",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({username,email,password,phoneNum})
        });
        const data = await res.json();
        console.log(data);
        if(res.ok){
            alert("Signed up successfully");
            signupForm.reset();
        } else {
            alert("Signup failed: " + data.message);
        }
    } catch(err){
        console.log("Server error:", err);
        alert("Can't connect to server");
    }
});
