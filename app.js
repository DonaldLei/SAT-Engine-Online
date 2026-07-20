let currentQuestionIndex = 0;
let questionsData = [];
let questionCorrect = 0;
let questionIncorrect = 0;

//Section DOM
const welcomeSection = document.getElementById('welcomeSection');
const authenticationSection = document.getElementById('authenticationSection');
const dashboardSection = document.getElementById('dashboardSection');
const practiceSection = document.getElementById('practiceSection')

//Button DOM
const enterPortalButton = document.getElementById('enterPortalButton');
const loginButton = document.getElementById('login');
const logoutButton = document.getElementById('logout');
const startPracticeButton = document.getElementById('startPractice');

function changeSection(nextSection){
    welcomeSection.classList.add('hidden');
    authenticationSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    practiceSection.classList.add('hidden');

    nextSection.classList.remove('hidden');
}

enterPortalButton.addEventListener('click', () => {
    changeSection(authenticationSection);
}); 

loginButton.addEventListener('click', () => {
    changeSection(dashboardSection);
});

logoutButton.addEventListener('click', () => {
    changeSection(welcomeSection);
});

startPracticeButton.addEventListener('click', async () => {
    try {
        const response = await fetch('questionTesting.json');
        questionsData = await response.json();

        changeSection(practiceSection);
        pullQuestion();
    } catch (error) {
        console.error("Failed to fetch questions:", error);
    }
});

function pullQuestion() {
    const container = document.getElementById('practiceSection');
    
    if (currentQuestionIndex >= questionsData.length) {
        container.innerHTML = `
            <div class="question-box">
                <h3>Practice Complete!</h3>
                <h2>Questions Correct: ${questionCorrect}</h2>
                <h2>Questions Incorrect: ${questionIncorrect}</h2>
                <button onclick="location.reload()">Back</button>
            </div>
        `;
        return;
    }

    const q = questionsData[currentQuestionIndex];

    container.innerHTML = `
        <div class="question-box">
            <h3>${q.questionID}</h3> 
            <form id="quizForm">
                <label>
                    <input type="radio" name="answer" value="Incorrect"> Incorrect
                </label><br>
                <label>
                    <input type="radio" name="answer" value="Correct"> Correct
                </label><br>
                <button type="submit">Submit</button>
            </form>
        </div>
    `;

    const form = document.getElementById('quizForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(form);

        const userChoice = formData.get('answer');

        if(userChoice == "Incorrect"){
            questionIncorrect++;   
            currentQuestionIndex++;
            pullQuestion(); 
        } else if(userChoice == "Correct"){
            questionCorrect++;
            currentQuestionIndex++;
            pullQuestion(); 
        } else {
            alert("Choose an option.");
        }
    });
}