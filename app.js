let questionsData = [];
let currentQuestionIndex = 0;
let questionCorrect = 0;
let questionIncorrect = 0;
let questionAmount = 0;
let isQuizActive = false;
let timerInterval = null;
let hasLeftTheScreen = false;
let startTime = null;
let liveCounter = null;
let diagnosticSubject = '';
let blockPractice = false;
let questionSubjectDataToDelete = '';
const chartInstances = {};

//Section DOM
const welcomeSection = document.getElementById('welcomeSection');
const authenticationSection = document.getElementById('authenticationSection');
const dashboardSection = document.getElementById('dashboardSection');
const practiceSection = document.getElementById('practiceSection');
const userSetupSection = document.getElementById('userSetupSection');
const scheduleTestSection = document.getElementById('scheduleTestSection');
const diagnosticSection = document.getElementById('diagnosticSection');
const profileSection = document.getElementById('profileSection');
const statisticsSection = document.getElementById('statisticsSection');

//Tutor Section DOM
const tutorDashboardSection = document.getElementById('tutorDashboardSection');
const tutorStatisticsSection = document.getElementById('tutorStatisticsSection');
const tutorTestSchedulingSection = document.getElementById('tutorTestSchedulingSection');

//View DOM
const statisticsCharts = document.getElementById('statisticsCharts');
const statisticsQuestions = document.getElementById('statisticsQuestions');

//Button DOM
const enterPortalButton = document.getElementById('enterPortalButton');
const logoutButton = document.getElementById('logout');
const startPracticeReadingButton = document.getElementById('startPracticeReading');
const startPracticeMathButton = document.getElementById('startPracticeMath');
const userProfileForm = document.getElementById('userProfileForm');
const menuButtons = document.querySelectorAll('.menuButton');
const scheduleTestDate = document.getElementById('scheduleTestDate');

//Supabase authentication and sign up
const SUPABASE_URL = "https://yksokqpgtusgdvnerfsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Npi4T6_d7FZH8aWpl_wTsA_QZPChsQ0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const modal = document.getElementById("authModal");
const modalTitle = document.getElementById("modalTitle");
const authSubmit = document.getElementById("authSubmit");
const authError = document.getElementById("authError");
let currentMode;

// Handle password reset redirect from Supabase email link
client.auth.onAuthStateChange((event, session) => {
    if(event === 'PASSWORD_RECOVERY'){
        const resetPasswordModal = document.getElementById("resetPasswordModal");
        document.getElementById("resetModalTitle").textContent = "Set New Password";
        document.getElementById("resetModalSubtitle").textContent = "Enter and confirm your new password.";
        document.getElementById("resetEmailStep").style.display = "none";
        document.getElementById("resetNewPasswordStep").style.display = "block";
        document.getElementById("resetMessage").textContent = "";
        resetPasswordModal.style.display = "flex";
    }
});

document.getElementById("updatePasswordSubmit")?.addEventListener("click", async () => {
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const resetMessage = document.getElementById("resetMessage");

    if(!newPassword || !confirmPassword){
        resetMessage.style.color = "red";
        resetMessage.textContent = "Please fill in both fields.";
        return;
    }

    if(newPassword !== confirmPassword){
        resetMessage.style.color = "red";
        resetMessage.textContent = "Passwords do not match.";
        return;
    }

    if(newPassword.length < 6){
        resetMessage.style.color = "red";
        resetMessage.textContent = "Password must be at least 6 characters.";
        return;
    }

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error){
        resetMessage.style.color = "red";
        resetMessage.textContent = error.message;
    } else {
        resetMessage.style.color = "green";
        resetMessage.textContent = "Password updated! Please log in.";
        await client.auth.signOut();
        setTimeout(() => {
            document.getElementById("resetPasswordModal").style.display = "none";
            changeSection(welcomeSection);
        }, 2000);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const { data: { session } } = await client.auth.getSession();

    if(session){
        await checkRole();
        const { data: profile } = await client
            .from('userProfiles')
            .select('first_name, last_name, role')
            .eq('id', session.user.id)
            .single();

        
        if(!profile || !profile.first_name || !profile.last_name){
            changeSection(userSetupSection);
        } else {
            const savedSectionId = localStorage.getItem('lastViewedSection');
            const targetSection = savedSectionId ? document.getElementById(savedSectionId) : null;

            if(targetSection && targetSection.id !== 'welcomeSection' && targetSection.id !== 'authenticationSection'){
                changeSection(targetSection);
                
                if(targetSection.id === 'dashboardSection'){
                    await renderDashboard();
                }

                if(targetSection.id === 'tutorDashboardSection'){
                    await renderTutorDashboard();
                }

                if(targetSection.id === 'scheduleTestSection'){
                    await fetchScheduleTestDate();
                }

                if(targetSection.id === 'tutorTestSchedulingSection'){
                    await fetchStudentScheduledTestDates();
                }

                if(targetSection.id === 'profileSection'){
                    await renderProfile();
                }

                if(targetSection.id === 'statisticsSection'){
                    await renderStatistics();
                }

            } else {
                await renderDashboard();
                await renderTutorDashboard();
                await fetchScheduleTestDate();
                await renderProfile();
                await renderStatistics();
            }
        }
    } else {
        changeSection(welcomeSection);
    }
    
    if(loadingOverlay){
        loadingOverlay.style.display = 'none';
    }
});

document.getElementById("login").addEventListener("click", () => {
    currentMode = "login";
    modalTitle.textContent = "Log In";
    authSubmit.textContent = "Log In";
    authError.textContent = "";
    document.getElementById("forgotPassword").style.display = "block";
    modal.style.display = "flex";
});

document.getElementById("signup").addEventListener("click", () => {
    currentMode = "signup";
    modalTitle.textContent = "Sign Up";
    authSubmit.textContent = "Sign Up";
    authError.textContent = "";
    document.getElementById("forgotPassword").style.display = "none";
    modal.style.display = "flex";
});

document.getElementById("closeModal").addEventListener("click", () => {
    modal.style.display = "none";
});

// Forgot password
const resetPasswordModal = document.getElementById("resetPasswordModal");

document.getElementById("forgotPassword").addEventListener("click", () => {
    modal.style.display = "none";
    resetPasswordModal.style.display = "flex";
    document.getElementById("resetMessage").textContent = "";
    document.getElementById("resetEmail").value = "";
});

document.getElementById("closeResetModal").addEventListener("click", () => {
    resetPasswordModal.style.display = "none";
});

document.getElementById("resetSubmit").addEventListener("click", async () => {
    const email = document.getElementById("resetEmail").value.trim();
    const resetMessage = document.getElementById("resetMessage");

    if(!email){
        resetMessage.style.color = "red";
        resetMessage.textContent = "Please enter your email.";
        return;
    }

    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href
    });

    if(error){
        resetMessage.style.color = "red";
        resetMessage.textContent = error.message;
    } else {
        resetMessage.style.color = "green";
        resetMessage.textContent = "Reset link sent! Check your email.";
    }
});

authSubmit.addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    authError.textContent = "";

    if(!email || !password){
        authError.textContent = "Please enter your email and password.";
        return;
    }

    if(currentMode === "login"){
        const { error } = await client.auth.signInWithPassword({ email, password });
        if(error){
            authError.textContent = error.message;
        } else {
            modal.style.display = "none";
            const { data: { user } } = await client.auth.getUser(); 
            
            const { data, error } = await client
                .from('userProfiles')
                .select('first_name, last_name, role')
                .eq('id', user.id)
                .single();
            
            if(error){
                console.error("Could not fetch user: ", error);
            }
            
            if(!data.first_name || !data.last_name){
                changeSection(userSetupSection);
            } else if(data.role === 'Student'){
                await renderDashboard();
            } else if(data.role === 'Tutor'){
                await renderTutorDashboard();
            }
        }
    } else {
        const { error } = await client.auth.signUp({ email, password });
        if(error){
            authError.textContent = error.message;
        } else {
            modal.style.display = "none";
            alert("Account created! Check your email to confirm your account.");
        }
    }
});

//Welcome message

function getCurrentDate(){
    const today = new Date();
  
    let dayName = today.toLocaleDateString('en-US', {weekday: 'long'});
    let monthName = today.toLocaleDateString('en-US', {month: 'long'});
    let dayOfMonth = today.getDate();

    const formattedDate = `${monthName} ${dayOfMonth} | ${dayName}`;
    
    const currentDateElements = document.querySelectorAll('.current-date');

    currentDateElements.forEach((element) => {
        element.innerHTML = formattedDate;
    });
}

async function fetchName(){
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
    if(error){
        console.error("Could not fetch name: ", error);
        changeSection(userSetupSection);
        return;
    }

    const welcomeUserMessage = document.getElementById('welcomeUserMessage');
    welcomeUserMessage.textContent = `Welcome, ${data.first_name}!`;
}

document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('appSidebar').classList.toggle('collapsed');
});
const startDiagnostic = document.getElementById('startDiagnostic');

function changeSection(nextSection){
    const sections = document.querySelectorAll('.viewApp');
    sections.forEach(s => s.classList.add('hidden'));
    
    nextSection.classList.remove('hidden');

    // const studentSidebar = document.getElementById('studentSidebar');
    const sidebar = document.getElementById('appSidebar');
    
    
    const hideSidebarOn = ['welcomeSection', 'authenticationSection', 'userSetupSection'];
    

    if(hideSidebarOn.includes(nextSection.id)){
        sidebar.classList.add('hidden'); 
    } else {
        sidebar.classList.remove('hidden');
    }

    document.querySelectorAll('.menuButton').forEach(button => {
        button.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.menuButton[data-target="${nextSection.id}"]`);

    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    localStorage.setItem('lastViewedSection', nextSection.id);
}

enterPortalButton.addEventListener('click', () => {
    changeSection(authenticationSection);
});

document.getElementById('backToWelcome').addEventListener('click', () => {
    modal.style.display = 'none';
    changeSection(welcomeSection);
});

document.getElementById('backToWelcome1').addEventListener('click', () => {
    modal.style.display = 'none';
    changeSection(welcomeSection);
});

document.getElementById('viewQuestionHistory').addEventListener('click', async (event) => {
    statisticsCharts.classList.add('hidden');
    statisticsQuestions.classList.remove('hidden');

    await renderAnsweredQuestions();
});

document.getElementById('viewStatisticsCharts').addEventListener('click', () => {
    statisticsQuestions.classList.add('hidden');
    statisticsCharts.classList.remove('hidden');
});

userProfileForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const { data: { user } } = await client.auth.getUser();

    const userProfileData = {
        id: user.id,
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        currentGrade: formData.get('gradeLevel'),
        targetApplicationDeadline: formData.get('deadline'),
        satAttempts: formData.get('satAttempts'),
        currentScore: formData.get('currentScore')
    }
    
    const { data, error } = await client
        .from('userProfiles')
        .upsert(userProfileData)
        .select();

    if(error){
        console.error("Error: ", error);
        return;
    }

    if(data){
        console.log("Profile updated!");
        await fetchDashboardInformation();
        changeSection(dashboardSection);
        await fetchName();
    } else {
        alert("Profile could not be updated!");
    }
});

//Insert new scheduling into the database for tutors, can only send one request at a time
scheduleTestDate.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const testDateText = formData.get('testDate');
    const deadlineDateText = formData.get('deadlineDate');

    const testDateToCompare = new Date(testDateText);
    const deadlineDateToCompare = new Date(deadlineDateText);

    const dateToday = new Date();
    dateToday.setHours(0, 0, 0, 0);

    let dayName = dateToday.toLocaleDateString('en-US', {weekday: 'long'});
    let monthName = dateToday.toLocaleDateString('en-US', {month: 'long'});
    let dayOfMonth = dateToday.getDate();

    if(testDateToCompare < dateToday || deadlineDateToCompare < dateToday){
        alert("You cannot schedule for this test date because the deadlines have passed! Please select another date.");
        return;
    } else if(deadlineDateToCompare > testDateToCompare){
        alert("Registration deadline should not be later than the scheduled test date. Please review the dates that you inputted.");
        return;
    }

    const { data: { user } } = await client.auth.getUser();

    const { data: studentName, error: studentNameError } = await client
        .from('userProfiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

    if(studentNameError){
        console.error("Student could not be fetched: ", studentNameError);
        return;
    }

    const { data, error } = await client
        .from('studentRequests')
        .upsert({
            studentID: user.id,
            scheduleDate: testDateText,
            studentFirstName: studentName.first_name,
            studentLastName: studentName.last_name,
            registrationDeadline: deadlineDateText,
            registrationStatus: 'Not registered'
        }, { onConflict: 'studentID' });

    if(error){
        console.error("Test date cannot be rescheduled: ", error);
        return;
    }

    if(data){
        alert("Scheduled test has been requested."); 
    } else {
        alert("Scheduled test has been requested.");
    }

    await fetchScheduleTestDate();
});

//To be used to determine which interface to show the user 
async function checkRole(){
    const { data: { user } } = await client.auth.getUser();

    if(!user){
        return;
    }

    const { data, error } = await client
        .from('userProfiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if(error){
        console.error("Could not fetch user's role: ", error);
        return;
    }

    const userRole = data.role;

    const studentSidebar = document.getElementById('studentSidebar');
    const tutorSidebar = document.getElementById('tutorSidebar');

    if(userRole === 'Tutor'){
        studentSidebar.style.display = 'none';
        tutorSidebar.style.display = 'flex';
    } else {
        studentSidebar.style.display = 'flex';
        tutorSidebar.style.display = 'none';
    }
}

async function testScheduleCheck(){
    const welcomeMessage = document.getElementById('welcomeMessage');

    const { data: { user } } = await client.auth.getUser();    

    const { data, error } = await client
        .from('studentRequests')
        .select('*')
        .eq('studentID', user.id)
        .maybeSingle();
    
    //If there is a test date scheduled
    if(error){
        console.error("No test scheduled yet:", error);
        return;
    } 
    
    if(!data){
        if(welcomeMessage){
            welcomeMessage.textContent = "Continue your work!";
            blockPractice = false;
            return;
        }
    }

    const msPerDay = 1000 * 60 * 60 * 24;

    const dateToday = new Date();
    dateToday.setHours(0, 0, 0, 0);

    let dayName = dateToday.toLocaleDateString('en-US', { weekday: 'long' });
    let monthName = dateToday.toLocaleDateString('en-US', { month: 'long' });
    let dayOfMonth = dateToday.getDate();

    const testDateScheduled = new Date(data.scheduleDate);

    const remainingDaysUntilTest = Math.round((testDateScheduled - dateToday) / msPerDay);

    const daysAfterTest = Math.round((dateToday - testDateScheduled) / msPerDay);

    // Logic for practice blocking leading up to the exam (stop students from practicing 5 days leading up to the test)
    if(remainingDaysUntilTest >= 0 && remainingDaysUntilTest <= 5){
        welcomeMessage.textContent = "No more practice leading to your test!";
        blockPractice = true;
    } else if(daysAfterTest >= 0 && daysAfterTest <= 5){
        welcomeMessage.textContent = "Take a break, you deserved it!";
        blockPractice = true;
    } else {
        welcomeMessage.textContent = "Continue your work!";
        blockPractice = false;
    }
}

async function fetchScheduleTestDate(){
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('studentRequests')
        .select('scheduleDate, registrationDeadline, registrationStatus')
        .eq('studentID', user.id)
        .single();
    if(error){
        console.error("Could not fetch test date: ", error);
        return;
    }

    const scheduledDateText = document.getElementById('scheduledDateText');
    const registrationDeadline = document.getElementById('registrationDeadline');
    const registrationStatus = document.getElementById('registrationStatus');

    scheduledDateText.textContent = `Scheduled date: ${data.scheduleDate}`;
    registrationDeadline.textContent = `Registration deadline: ${data.registrationDeadline}`;
    registrationStatus.textContent = `Registration status: ${data.registrationStatus}`;
}

async function fetchStudentScheduledTestDates(){
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('studentRequests')
        .select('*')
    
    if(error){
        console.error("Could not fetch any scheduled dates: ", error);
    }

    if(data){
        let tempText = ``;

        const studentScheduleRequestsContainer = document.getElementById('studentScheduleRequestsContainer');
        for(let i = 0; i < data.length; i++){
            const item = data[i];

            tempText += `
                <div class = "studentScheduleCard">
                    <p>First Name: ${item.studentFirstName}<p>
                    <p>Last Name: ${item.studentLastName}</p>
                    <p>Scheduled Date: ${item.scheduleDate}</p>
                    <p>Registration Deadline: ${item.registrationDeadline}</p>
                    <p>Registration Status: ${item.registrationStatus}</p>
                </div>`

        }

        studentScheduleRequestsContainer.innerHTML = tempText;
    }
}

//Determine if student has completed the necessary work for today
async function checkEnglishQuestionsCompletedToday(){
    //Get the date today
    const dateToday = new Date();
    dateToday.setHours(0, 0, 0, 0);

    let dayName = dateToday.toLocaleDateString('en-US', {weekday: 'long'});
    let monthName = dateToday.toLocaleDateString('en-US', {month: 'long'});
    let dayOfMonth = dateToday.getDate();

    //Convert to allow it to be compared
    const dateString = dateToday.toISOString().split('T')[0];

    const { data: { user } } = await client.auth.getUser();
    
    const { count, error } = await client
        .from('userResponses')
        .select('questionID', { count: 'exact', head: true})
        .eq('id', user.id)
        .eq('subject', 'English')
        .eq('dateAnswered', dateString)
    
    if(error){
        console.error("Error fetching questions completed: ", error);
    } else {
        return count;
    }
}

async function checkMathQuestionsCompletedToday(){
    //Get the date today
    const dateToday = new Date();
    dateToday.setHours(0, 0, 0, 0);

    let dayName = dateToday.toLocaleDateString('en-US', {weekday: 'long'});
    let monthName = dateToday.toLocaleDateString('en-US', {month: 'long'});
    let dayOfMonth = dateToday.getDate();

    //Convert to allow it to be compared
    const dateString = dateToday.toISOString().split('T')[0];

    const { data: { user } } = await client.auth.getUser();
    
    const { count , error } = await client
        .from('userResponses')
        .select('questionID', { count: 'exact', head: true})
        .eq('id', user.id)
        .eq('subject', 'Mathematics')
        .eq('dateAnswered', dateString)
    
    if(error){
        console.error("Error fetching questions completed: ", error);
    } else {
        return count;
    }
}

async function renderDashboard(){
    changeSection(dashboardSection);
    await fetchName();
    await testScheduleCheck();
    await checkEnglishQuestionsCompletedToday();
    await checkMathQuestionsCompletedToday();

    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('studentRequests')
        .select('*')
        .eq('studentID', user.id)
        .maybeSingle();

    if(error){
        console.error("Error fetching registration status:", error);
        return;
    }

    if(data){
        const msPerDay = 1000 * 60 * 60 * 24; 

        const dateToday = new Date();
        dateToday.setHours(0, 0, 0, 0);

        let dayName = dateToday.toLocaleDateString('en-US', {weekday: 'long'});
        let monthName = dateToday.toLocaleDateString('en-US', {month: 'long'});
        let dayOfMonth = dateToday.getDate();
        
        const scheduledDate = new Date(data.scheduleDate);

        const registrationDeadline = new Date(data.registrationDeadline);

        const remainingDaysRegistrationDeadline = Math.round((registrationDeadline - dateToday) / msPerDay);

        if(remainingDaysRegistrationDeadline > 0){
            const importantReminders = document.getElementById('importantReminders');
            const remindersContainer = document.querySelector('.remindersContainer');
            remindersContainer.classList.remove('hidden');

            importantReminders.innerHTML = `
            <p>Have you completed your registration for your test scheduled for ${data.scheduleDate}? You have <b>${remainingDaysRegistrationDeadline}</b> day(s) left to register.</p>
            <button id='confirmRegistrationButton'>Confirm Registration</button>
            `;
            
            document.getElementById('confirmRegistrationButton').addEventListener('click', async (event) => {
                const { data: { user } } = await client.auth.getUser();

                const { data, error } = await client
                    .from('studentRequests')
                    .update({ registrationStatus: 'Registered' })
                    .eq('studentID', user.id)

                if (error) {
                    console.error("Request could not be found: ", error);
                    return;
                }

                alert("Registration status has been updated!");
                
                //Clear reminder
                importantReminders.innerHTML = ``;
                remindersContainer.classList.add('hidden');
                remindersContainer.style.display = 'none';
            });
        }
    }

    const userStatistics = await fetchDashboardInformation();
    const quickInformationEnglish = document.getElementById('skillsListReading');
    const quickInformationMathematics = document.getElementById('skillsListMathematics');

    if(!quickInformationEnglish || !quickInformationMathematics){
        console.warn("No data for user.");
        return;
    }

    let temporaryTextHolder1 = '';
    const englishLimit = Math.min(3, userStatistics.English.length);
    for(let i = 0; i < englishLimit; i++){
        const statistics = userStatistics.English[i];
        temporaryTextHolder1 += `
            <div class="skillsListReading">
                <ul>
                    <li><p>${statistics.domainName} | Accuracy: ${statistics.domainAccuracy}% | Avg: ${statistics.domainAverageTimeElapsed} seconds</p></li>
                </ul>
            </div>`;
    }
    quickInformationEnglish.innerHTML = temporaryTextHolder1;

    let temporaryTextHolder2 = '';
    const mathematicsLimit = Math.min(3, userStatistics.Mathematics.length);
    for(let i = 0; i < mathematicsLimit; i++){
        const statistics = userStatistics.Mathematics[i];
        temporaryTextHolder2 += `
            <div class="skillsListMathematics">
                <ul>
                    <li><p>${statistics.domainName} | Accuracy: ${statistics.domainAccuracy}% | Avg: ${statistics.domainAverageTimeElapsed} seconds</p></li>
                </ul>
            </div>`;
    }
    quickInformationMathematics.innerHTML = temporaryTextHolder2;

    //Logic for task completion
    const englishQuestionsCompleted = await checkEnglishQuestionsCompletedToday();
    const mathQuestionsCompleted = await checkMathQuestionsCompletedToday();

    const tasksRemaining = document.getElementById('tasksRemaining');

    tasksRemaining.innerHTML = `
        <div class ="remainingTasks">
            <p id ="remainingTasksEnglish">You completed ${englishQuestionsCompleted} out of 15 Reading & Writing questions required today!</p>
            <p id ="remainingTasksMath">You completed ${mathQuestionsCompleted} out of 15 Mathematics questions required today!</p>
        </div>
    `;

    if(englishQuestionsCompleted >= 15 && mathQuestionsCompleted >= 15){
        tasksRemaining.innerHTML = `
            <div class ="remainingTasks">
                <p id ="remainingTasksText">You have completed all tasks for today! Feel free to practice more if you wish.</p>
            </div>
        `;
    }
}

async function renderTutorDashboard(){
    changeSection(tutorDashboardSection);

    const { data: { user } } = await client.auth.getUser();

    const { count, error } = await client
        .from('studentRequests')
        .select('studentID', { count: 'exact', head: true})
        .eq('registrationStatus', 'Not registered');
    
    if(error){
        console.error("Error fetching number of student requests: ", error);
    }

    console.log(count);

    if(count > 0){
        const tutorRemindersContainer = document.querySelector('.tutorRemindersContainer');
        const tutorNotifications = document.getElementById('tutorNotifications');

        tutorRemindersContainer.classList.remove('hidden');

        tutorNotifications.innerHTML = `
        <p>You have <b>${count}</b> students who haven't registered for their upcoming test date!</p>`;
    }
}

async function renderProfile(){
    changeSection(profileSection);

    // Always start in view mode
    document.getElementById('profileView').classList.remove('hidden');
    document.getElementById('profileEdit').classList.add('hidden');

    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if(error){
        console.error("Issue with fetching user profile: ", error);
        return;
    }

    // Populate view mode
    document.getElementById('firstNameText').innerHTML = `<b>First Name: </b> ${data.first_name || ''}`;
    document.getElementById('lastNameText').innerHTML  = `<b>Last Name: </b>${data.last_name || ''}`;
    document.getElementById('gradeText').innerHTML  = `<b>Current Grade: </b> ${data.currentGrade || ''}`;
    document.getElementById('targetDateText').innerHTML = `<b>Target College Application Deadline: </b>${data.targetApplicationDeadline || ''}`;
    document.getElementById('testAttemptsText').innerHTML  = `<b>Test Attempts: </b>${data.satAttempts ?? ''}`;
    document.getElementById('currentScoreText').innerHTML  = `<b>Current Score: </b>${data.currentScore ?? ''}`;

    // "Change Information" — switch to edit mode pre-filled with current data
    document.getElementById('changeUserProfileButton').onclick = () => {
        document.getElementById('editFirstName').value = data.first_name || '';
        document.getElementById('editLastName').value = data.last_name || '';
        document.getElementById('editGrade').value = data.currentGrade || '9';
        document.getElementById('editDeadline').value = data.targetApplicationDeadline || '';
        document.getElementById('editAttempts').value = data.satAttempts ?? '';
        document.getElementById('editScore').value = data.currentScore ?? '';
        document.getElementById('editProfileError').classList.add('hidden');
        document.getElementById('profileView').classList.add('hidden');
        document.getElementById('profileEdit').classList.remove('hidden');
    };

    // "Cancel" — go back to view mode
    document.getElementById('cancelEditButton').onclick = () => {
        document.getElementById('profileEdit').classList.add('hidden');
        document.getElementById('profileView').classList.remove('hidden');
    };

    document.getElementById('resetEnglishUserResponseData').onclick = () => {
        document.getElementById('profileView').classList.add('hidden');
        document.getElementById('resetCautionMessage').classList.remove('hidden');
        questionSubjectDataToDelete = 'English';
        const resetSubjectDisclaimer = document.getElementById('resetSubjectDisclaimer');
        resetSubjectDisclaimer.innerHTML = `IMPORTANT: ALL ENGLISH PROGRESS WILL BE DELETED!`;
    }

    document.getElementById('resetMathUserResponseData').onclick = () => {
        document.getElementById('profileView').classList.add('hidden');
        document.getElementById('resetCautionMessage').classList.remove('hidden');
        questionSubjectDataToDelete = 'Mathematics';
        const resetSubjectDisclaimer = document.getElementById('resetSubjectDisclaimer');
        resetSubjectDisclaimer.innerHTML = `IMPORTANT: ALL MATHEMATICS PROGRESS WILL BE DELETED!`;
    }
        
    document.getElementById('resetConfirmationNo').onclick = (e) =>  {
        e.preventDefault();
        document.getElementById('resetCautionMessage').classList.add('hidden');
        document.getElementById('profileView').classList.remove('hidden');
    }

    document.getElementById('resetConfirmationYes').onclick = async(e) =>  {
        e.preventDefault();

        const { data, error } = await client
            .from('userResponses')
            .delete()
            .select('*')
            .eq('id', user.id)
            .eq('subject', questionSubjectDataToDelete);

        if(error){
            console.error("User data could not be deleted:", error);
            return;
        } else {
            alert("Your data has been deleted.");
        }

        if(questionSubjectDataToDelete == "English"){
            const { data, error } = await client
                .from('userProfiles')
                .update({ ReadingDiagnosticCompleted: false} )
                .eq('id', user.id);
        } else {
            const { data, error } = await client
                .from('userProfiles')
                .update({ MathDiagnosticCompleted: false} )
                .eq('id', user.id);
        }

        document.getElementById('resetCautionMessage').classList.add('hidden');
        document.getElementById('profileView').classList.remove('hidden');
    }

    

    // "Save" — upsert to Supabase then refresh view
    document.getElementById('editProfileForm').onsubmit = async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('editProfileError');
        errorEl.classList.add('hidden');

        const firstName = document.getElementById('editFirstName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();

        if(!firstName || !lastName){
            errorEl.textContent = 'First and last name are required.';
            errorEl.classList.remove('hidden');
            return;
        }

        const saveBtn = document.getElementById('saveProfileButton');
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const { error: updateError } = await client
            .from('userProfiles')
            .update({
                first_name: firstName,
                last_name: lastName,
                currentGrade: document.getElementById('editGrade').value,
                targetApplicationDeadline: document.getElementById('editDeadline').value || null,
                satAttempts: document.getElementById('editAttempts').value || null,
                currentScore: document.getElementById('editScore').value || null,
            })
            .eq('id', user.id);

        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;

        if(updateError){
            errorEl.textContent = 'Could not save changes. Please try again.';
            errorEl.classList.remove('hidden');
            console.error('Profile update error:', updateError);
            return;
        }

        // Refresh profile view with updated data
        await renderProfile();
    };
}

function createChart(canvasId, domainData) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    if(chartInstances[canvasId]){
        chartInstances[canvasId].destroy();
    }

    const skillNames = [];
    const skillAccuracy = [];

    for(const skill of domainData.skills){
        skillNames.push(skill.skillName);
        skillAccuracy.push(skill.accuracy);
}

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: skillNames,
            datasets: [{
                label: 'Skill Accuracy %',
                data: skillAccuracy,
                backgroundColor: '#89CFF0'
            }]
        },
        options: { 
            responsive: true, 
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: domainData.domainName
                }
            },
            scales: { 
                y: { max: 100 } 
            } 
        }
    });
}

async function renderStatistics() {
    const stats = await fetchDashboardInformation();
    const readingStats = stats.English;
    const mathStats = stats.Mathematics;

    for (let i = 1; i <= 4; i++) {
        const canvasId = `chart-${i}`;
        const currentCanvas = document.getElementById(canvasId);
        const chartData = readingStats[i - 1];
        if(currentCanvas){
            if(chartData){
                currentCanvas.style.display = 'block';
                createChart(canvasId, chartData);
            }
        } else {
            currentCanvas.style.display = 'none';
        }
    }

    for (let i = 5; i <= 8; i++) {
        const canvasId = `chart-${i}`;
        const currentCanvas = document.getElementById(canvasId);
        const chartData = mathStats[i - 5];
        if(currentCanvas){
            if(chartData){
                currentCanvas.style.display = 'block';
                createChart(canvasId, chartData);
            }
        } else {
            currentCanvas.style.display = 'none';
        }
    }
}

async function renderAnsweredQuestions(){
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userResponses')
        .select('*')
        .eq('id', user.id)

    if(error){
        console.error("User has not answered any questions:", error);
        return;
    }

    const allQuestionsAnsweredContainer = document.getElementById('allQuestionsAnsweredContainer');
    
    let tempText = `
        <div class="answeredQuestionCard headerCard show">
            <p><b>Question ID</b></p>
            <p><b>Subject</b></p>
            <p><b>Domain</b></p>
            <p><b>Skill</b></p>
            <p><b>Difficulty</b></p>
            <p><b>Time</b></p>
            <p><b>Answer</b></p>
        </div>
    `;

    for(let i = 0; i < data.length; i++){
        const item = data[i];
        
        let answer = item.isCorrect ? 'Correct' : 'Incorrect';

        if(!item.isCorrect && item.errorType){
            answer += ` (${item.errorType})`;
        }

        tempText += `
            <div class="answeredQuestionCard show ${item.subject} ${answer}">
                    <p>${item.questionID}</p>
                    <p>${item.subject}</p>
                    <p>${item.questionDomain}</p>
                    <p>${item.questionSkill}</p>
                    <p>${item.difficulty}</p>
                    <p>${item.timeElapsed}</p>
                    <p>${answer}</p>
            </div>
        `
    }
    allQuestionsAnsweredContainer.innerHTML = tempText;
}

function filterSubject(c, event){
    const questionCards = document.getElementsByClassName("answeredQuestionCard");
    
    for(let i = 0; i < questionCards.length; i++){
        if(questionCards[i].classList.contains('headerCard')){
            continue;
        }

        questionCards[i].classList.remove("show");

        if(c == "All" || questionCards[i].classList.contains(c)){
            questionCards[i].classList.add("show");
        }
    }

    const filters = document.getElementsByClassName("filterButton");

    for(let i = 0; i < filters.length; i++){
        filters[i].classList.remove("active");
    }
    
    event.currentTarget.classList.add("active");
}

window.filterSubject = filterSubject;

document.querySelectorAll('.menuButton').forEach(button => {
    button.addEventListener('click', async () => {
        const targetId = button.getAttribute('data-target');
        const action = button.getAttribute('data-action');
        const targetSection = document.getElementById(targetId);

        if(action === 'logout'){
            try {
                await client.auth.signOut();
                localStorage.removeItem('lastViewedSection');
                changeSection(targetSection);
            } catch (error){
                console.error("Error signing out:", error);
            }
            return;
        }

        if(targetId === 'dashboardSection'){
            await renderDashboard();
        }

        if(targetId === 'tutorDashboardSection'){
            await renderTutorDashboard();
        }

        if(targetId === 'scheduleTestSection'){
            await fetchScheduleTestDate();
        }

        if(targetId === 'tutorTestSchedulingSection'){
            await fetchStudentScheduledTestDates();
        }

        if(targetId === 'statisticsSection'){
            await renderStatistics();
        }

        if(targetId === 'profileSection'){
            await renderProfile();
        }

        if(targetId){
            if(targetSection){
                changeSection(targetSection);
                localStorage.setItem('lastViewedSection', targetId);
            }
        }
    });
});

startDiagnostic.addEventListener('click', async () => {
    let diagnosticTableName;
    
    if(diagnosticSubject === "English"){
        diagnosticTableName = 'diagnosticReadingQuestions';
    } else {
        diagnosticTableName = 'diagnosticMathQuestions';
    }

    const { data, error } = await client
        .from(diagnosticTableName)
        .select('*');

    if(error){
        console.error("Fetch failed:", error);
        return;
    }

    startQuiz(data);
});

function startQuiz(questions){
    if(!questions){
        return;
    }

    questionsData = questions;
    isQuizActive = true;
    questionAmount = questionsData.length;
    changeSection(practiceSection);
    pullQuestion(questionAmount);
}

startPracticeReadingButton.addEventListener('click', async () => {
    if(blockPractice == true){
        alert("No practice allowed leading up to your exam date. Take a break!");
        return;
    }
    currentQuestionIndex = 0;
    questionCorrect = 0;
    questionIncorrect = 0;
    hasLeftTheScreen = false;

    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from('userProfiles')
        .select('ReadingDiagnosticCompleted')
        .eq('id', user.id)
        .single();

    const { count: totalReadingQuestions, error: totalReadingQuestionsError } = await client
        .from('AllReadingQuestions')
        .select('*', { count: 'exact', head: true});
    
    const { count: answeredReadingQuestionsCount, error: answeredReadingQuestionsCountError } = await client
        .from('userResponses')
        .select('questionID', { count: 'exact', head: true})
        .eq('id', user.id)
        .eq('subject', 'English');

    if(answeredReadingQuestionsCount >= totalReadingQuestions){
        alert("You have answered all reading questions. Please reset your data in profile, if you wish to continue practicing.");
        return;
    }

    if(data.ReadingDiagnosticCompleted === false){
        diagnosticSubject = "English";
        changeSection(diagnosticSection);
    } else { 
        try {
            const questionsData = await adaptiveAlgorithm('English');
            startQuiz(questionsData);
        } catch(error){
            console.error("Failed to fetch questions: ", error);
        }
    }
});

startPracticeMathButton.addEventListener('click', async () => {
    if(blockPractice == true){
        alert("No practice allowed leading up to your exam date. Take a break!");
        return;
    }

    currentQuestionIndex = 0;
    questionCorrect = 0;
    questionIncorrect = 0;
    hasLeftTheScreen = false;

    const { data: { user } } = await client.auth.getUser();

    const{ data, error } = await client
        .from('userProfiles')
        .select('MathDiagnosticCompleted')
        .eq('id', user.id)
        .single();

    const { count: totalMathQuestions, error: totalMathQuestionsError } = await client
        .from('AllMathQuestions')
        .select('*', { count: 'exact', head: true});
    
    const { count: answeredMathQuestionsCount, error: answeredMathQuestionsCountError } = await client
        .from('userResponses')
        .select('questionID', { count: 'exact', head: true})
        .eq('id', user.id)
        .eq('subject', 'Math');

    if(answeredMathQuestionsCount >= totalMathQuestions){
        alert("You have answered all math questions. Please reset your data in profile, if you wish to continue practicing.");
        return;
    }

    if(data.MathDiagnosticCompleted === false){
        diagnosticSubject = "Math";
        changeSection(diagnosticSection);
    } else {
        try {
            const questionsData = await adaptiveAlgorithm('Mathematics');
            startQuiz(questionsData);
        } catch (error){
            console.error("Failed to fetch questions: ", error);
        }
    }
});

//Detects when user leaves the screen to start the timer
document.addEventListener("visibilitychange", () => {
    if(isQuizActive && document.visibilityState == 'hidden' && !hasLeftTheScreen){
        hasLeftTheScreen = true;

        startTime = performance.now();
        const timeCounter = document.getElementById('timeCounter');
        liveCounter = setInterval(() => {
            const currentTime = performance.now();
            const secondsPassed = Math.floor((currentTime - startTime) / 1000);

            timeCounter.textContent = `Time Taken: ${secondsPassed} seconds`;
        }, 1000);
    }
});

async function pullQuestion(questionAmount){
    const container = document.getElementById('practiceSection');

    if(currentQuestionIndex >= questionAmount){
        isQuizActive = false;
        clearInterval(liveCounter);

        const { data: { user } } = await client.auth.getUser();

        const { data: profileStatus } = await client
            .from('userProfiles')
            .select('ReadingDiagnosticCompleted, MathDiagnosticCompleted')
            .eq('id', user.id)
            .single();

        if(profileStatus?.ReadingDiagnosticCompleted === false){
            await client
                .from('userProfiles')
                .update({ ReadingDiagnosticCompleted: true })
                .eq('id', user.id);
        }

        if(profileStatus?.MathDiagnosticCompleted === false){
            await client
                .from('userProfiles')
                .update({ MathDiagnosticCompleted: true })
                .eq('id', user.id);
        }

        container.innerHTML = `
            <div class="question-box">
                <h3>Practice Complete!</h3>
                <h2>Questions Correct: ${questionCorrect}</h2>
                <h2>Questions Incorrect: ${questionIncorrect}</h2>
                <button id = "backToDashboard">Back</button>
            </div>
        `;

        document.getElementById('backToDashboard').addEventListener('click', () => {
            changeSection(dashboardSection);
        });
        
        return;
    }

    const q = questionsData[currentQuestionIndex];

    container.innerHTML = `
        <div class="question-box">
            <div id = "timeCounter">Time Taken: 0 seconds</div>
            <p>Question: ${currentQuestionIndex + 1} / ${questionAmount}</p>
            <h3>${q.questionID}</h3>
            <h3>${q.questionDomain}: ${q.questionSkill}</h3> 
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

    startTime = performance.now();

    const quizForm = document.getElementById('quizForm');
    quizForm.addEventListener('submit', async function(event){
        event.preventDefault();
        const endTime = performance.now();
        const timeElapsedMs = endTime - startTime;
        const totalSeconds = Math.floor(timeElapsedMs / 1000);
        let isCorrectBoolean;

        if (liveCounter){
            clearInterval(liveCounter);
            liveCounter = null;
        }

        const formData = new FormData(quizForm);
        const userChoice = formData.get('answer');

        if(userChoice == "Incorrect"){
            isCorrectBoolean = false;
            questionIncorrect++;
            container.innerHTML = `        
            <div class="question-box">
                <p>Classify your error: </p>
                <form id="errorForm">
                    <label>
                        <input type="radio" name="answer" value="Content"> Content
                    </label><br>
                    <label>
                        <input type="radio" name="answer" value="Process"> Process
                    </label><br>
                    <label>
                        <input type="radio" name="answer" value="Careless"> Careless
                    </label><br>
                    <label>
                        <input type="radio" name="answer" value="Time"> Time
                    </label><br>
                    <button type="submit">Submit</button>
                </form>
            </div>`;

            const errorForm = document.getElementById('errorForm');

            errorForm.addEventListener('submit', async function(event){
                event.preventDefault();
                const formData = new FormData(errorForm);
                const userErrorClassification = formData.get('answer');

                if(!userErrorClassification){
                    alert("Please classify your error");
                    return;
                }

                const { data: { user } } = await client.auth.getUser();

                const { data, error } = await client
                    .from('userResponses')
                    .insert([{
                        id: user.id,
                        questionID: q.questionID,
                        questionDomain: q.questionDomain,
                        questionSkill: q.questionSkill,
                        difficulty: q.questionDifficulty,
                        timeElapsed: totalSeconds,
                        isCorrect: isCorrectBoolean,
                        subject: q.subject,
                        errorType: userErrorClassification, 
                        isDiagnostic: q.isDiagnostic
                    }]);
                
                if(error){
                    console.error("Issue with inserting: ", error);
                }

                currentQuestionIndex++;
                hasLeftTheScreen = false;
                startTime = null;
                pullQuestion(questionAmount);
            });
            
        } else if (userChoice == "Correct"){
            isCorrectBoolean = true;
            questionCorrect++;
            const { data: { user } } = await client.auth.getUser();

            const { data, error } = await client
                .from('userResponses')
                .insert([{
                    id: user.id,
                    questionID: q.questionID,
                    questionDomain: q.questionDomain,
                    questionSkill: q.questionSkill,
                    difficulty: q.questionDifficulty,
                    timeElapsed: totalSeconds,
                    isCorrect: isCorrectBoolean,
                    subject: q.subject,
                    isDiagnostic: q.isDiagnostic
                }]);

            if(error){
                console.error("Issue with inserting: ", error);
            }

            currentQuestionIndex++;
            hasLeftTheScreen = false;
            startTime = null;
            pullQuestion(questionAmount);

        } else {
            alert("Choose an option.");
            return;
        }
    });
}

// User reponse analysis

async function fetchDashboardInformation(){
    const { data: { user } } = await client.auth.getUser();

    const { data: profileData , error: profileError } = await client
        .from('userProfiles')
        .select('ReadingDiagnosticCompleted, MathDiagnosticCompleted')
        .eq('id', user.id)
        .single();

    if(profileError){
        console.error("User diagnostic status could not be fetched!");
    }

    if(profileData.ReadingDiagnosticCompleted === false){
        const readingPracticeDescription = document.getElementById('readingPracticeDescription');
        readingPracticeDescription.innerHTML = "Start your diagnostic!";
    }

    if(profileData.MathDiagnosticCompleted === false){
        const mathPracticeDescription = document.getElementById('mathPracticeDescription');
        mathPracticeDescription.innerHTML = "Start your diagnostic!";
    }

    //Fetch all questions that the user has answered
    const { data , error } = await client
        .from('userResponses')
        .select('subject, questionDomain, questionSkill, timeElapsed, isCorrect')
        .eq('id', user.id);

    if(error){
        console.error("Error fetching user responses: ", error);
        return;
    }

    const questionMap = {
        English: {},
        Mathematics: {}
    };

    for(const item of data){
        const questionDomainName = item.questionDomain;
        const questionSubject = item.subject;
        const questionSkillName = item.questionSkill;

        if(!questionMap[questionSubject]) {
            questionMap[questionSubject] = {};
        }
        if(!questionMap[questionSubject][questionDomainName]) {
            questionMap[questionSubject][questionDomainName] = {};
        }
        
        if(!questionMap[questionSubject][questionDomainName][questionSkillName]){
            questionMap[questionSubject][questionDomainName][questionSkillName] = {
                domainName: questionDomainName,
                skillName: questionSkillName,
                totalQuestions: 0,
                correctCount: 0,
                totalTimeElapsed: 0
            };
        }

        const questionGroup = questionMap[questionSubject][questionDomainName][questionSkillName];
        questionGroup.totalQuestions += 1;
        questionGroup.correctCount += item.isCorrect ? 1 : 0;
        questionGroup.totalTimeElapsed += item.timeElapsed;
    }

    const userStatistics = { English: [], Mathematics: [] };  

    for(const questionSubject in questionMap){
        userStatistics[questionSubject] = [];
        for(const questionDomain in questionMap[questionSubject]){
            const questionGroup = questionMap[questionSubject][questionDomain];
            
            const skillsGroup = [];
            let domainTotalQuestions = 0;
            let domainCorrectCount = 0;
            let domainTotalTime = 0;

            for(const skillName in questionGroup){
                const skillCategory = questionGroup[skillName];
                skillCategory.accuracy = Math.round((skillCategory.correctCount / skillCategory.totalQuestions) * 100);
                skillCategory.averageTime = Math.round(skillCategory.totalTimeElapsed / skillCategory.totalQuestions);
                skillsGroup.push(skillCategory)

                domainTotalQuestions += skillCategory.totalQuestions;
                domainCorrectCount += skillCategory.correctCount;
                domainTotalTime += skillCategory.totalTimeElapsed;
            }

            skillsGroup.sort((a, b) => a.accuracy - b.accuracy);

            userStatistics[questionSubject].push({
                domainName: questionDomain,
                domainAccuracy: Math.round((domainCorrectCount / domainTotalQuestions) * 100),
                domainAverageTimeElapsed: Math.round(domainTotalTime / domainTotalQuestions),
                skills: skillsGroup
            });
        }

        userStatistics[questionSubject].sort((a, b) => a.domainAccuracy - b.domainAccuracy);
    }

    return userStatistics;
}

//Basic walkthrough explanation of the adaptive algorithm process
//1. Pull all question responses from the current user (check)
//2. If the diagnostic questions have been completed, you have to cross reference from the user responses 
//to what questions that have been fetched. 
//How do we decide what questions to fetch? Decide based on the statistics (their accuracy), however we also have to fetch other questions
//so the student doesn't only have to do one domain of questions. 

async function adaptiveAlgorithm(databaseName){
    const userStatistics = await fetchDashboardInformation();
    const { data: { user } } = await client.auth.getUser();

    //Fetch all questions that the user have completed
    const { data } = await client
        .from('userResponses')
        .select('questionID')
        .eq('id', user.id);
    
    //Create a map to store the questionIDs
    const answeredIds = [];

    if(data){
        for(const item of data){
            answeredIds.push(item.questionID);
        }
    }

    let databaseToQuery = '';

    if(databaseName == "English"){
        databaseToQuery = "AllReadingQuestions";
    } else {
        databaseToQuery = "AllMathQuestions";
    }

    const sortedDomainAccuracy = userStatistics[databaseName];
    const topThreeWeakDomains = sortedDomainAccuracy.slice(0,3);

    let sessionQuestions = [];

    for(const questionDomainName of topThreeWeakDomains){
        let query = client
            .from(databaseToQuery)
            .select('*')
            .eq('questionDomain', questionDomainName.domainName)
            .limit(3);
        
        if(answeredIds.length > 0){
            query = query.not('questionID', 'in', `(${answeredIds.join(',')})`);
        }

        const { data, error } = await query;

        if(data && data.length > 0){
            sessionQuestions.push(...data);
        }
    }

    //Fill the rest with random questions
    if(sessionQuestions.length < 15){
        let questionsNeeded = 15 - sessionQuestions.length;

        let query = client 
            .from(databaseToQuery)
            .select('*')
            .limit(questionsNeeded);
        
        if(answeredIds.length > 0){
            query = query.not('questionID', 'in', `(${answeredIds.join(',')})`);
        }

        const { data, error } = await query;

        if(data && data.length > 0){
            sessionQuestions.push(...data);
        }
    }

    return sessionQuestions;
}

//Tutor interface logic