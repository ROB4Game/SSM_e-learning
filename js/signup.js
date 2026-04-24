

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

const serverIP = "10.7.0.114";

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const phoneNum = String(ccodeSelect.value) + String(phoneInput.value);
    

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
