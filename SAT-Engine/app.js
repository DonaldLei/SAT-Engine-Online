//Log in prompt
const welcomeSection = document.getElementById('welcomeSection');
const authenticationSection = document.getElementById('authenticationSection');
const dashboardSection = document.getElementById('dashboardSection');

const enterPortalButton = document.getElementById('enterPortalButton');
const loginButton = document.getElementById('login');

function changeSection(nextSection){
    welcomeSection.classList.add('hidden');
    authenticationSection.classList.add('hidden');

    nextSection.classList.remove('hidden');
}
enterPortalButton.addEventListener('click', () => {
    changeSection(authenticationSection);
}); 

loginButton.addEventListener('click', () => {
    changeSection(dashboardSection);
});

