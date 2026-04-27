

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
        alert("Parola trebuie să aibă cel puțin 8 caractere și să includă o literă mare, o cifră și un caracter special.");
        return;
    }

    if (!phoneLocalRule.test(cleanedPhone)) {
        alert("Numărul de telefon trebuie să conțină doar cifre și să aibă între 6 și 12 cifre.");
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
            alert("Înregistrare reușită");
            signupForm.reset();
        } else {
            alert("Înregistrare eșuată: " + data.message);
        }
    } catch(err){
        console.log("Eroare server:", err);
        alert("Nu se poate realiza conexiunea la server");
    }
});
