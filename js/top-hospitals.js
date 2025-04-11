// Function to load and display top hospitals
async function loadTopHospitals() {
    try {
        const response = await fetch('../data/organizations.csv');
        const data = await response.text();
        const hospitals = parseCSV(data);
        
        // Sort hospitals by utilization in descending order
        const sortedHospitals = hospitals.sort((a, b) => b.UTILIZATION - a.UTILIZATION);
        
        // Get top 10 hospitals
        const topHospitals = sortedHospitals.slice(0, 10);
        
        // Display top hospitals
        displayTopHospitals(topHospitals);
    } catch (error) {
        console.error('Error loading top hospitals:', error);
    }
}

// Function to parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });
}

// Function to display top hospitals in the UI
function displayTopHospitals(hospitals) {
    const topHospitalsList = document.getElementById('topHospitalsList');
    if (!topHospitalsList) return;

    const html = hospitals.map((hospital, index) => `
        <div class="hospital-item">
            <div class="hospital-rank">#${index + 1}</div>
            <div class="hospital-info">
                <h4>${hospital.NAME}</h4>
                <p>${hospital.CITY}, ${hospital.STATE}</p>
                <p>Utilization: ${hospital.UTILIZATION}</p>
            </div>
            <div class="hospital-contact">
                <p><i class="fas fa-phone"></i> ${hospital.PHONE}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${hospital.ADDRESS}</p>
            </div>
        </div>
    `).join('');

    topHospitalsList.innerHTML = html;
}

// Function to sort hospitals
function sortHospitals(hospitals, sortBy) {
    switch(sortBy) {
        case 'name':
            return hospitals.sort((a, b) => a.NAME.localeCompare(b.NAME));
        case 'city':
            return hospitals.sort((a, b) => a.CITY.localeCompare(b.CITY));
        case 'utilization':
        default:
            return hospitals.sort((a, b) => b.UTILIZATION - a.UTILIZATION);
    }
}

// Function to filter hospitals by specialty
function filterHospitalsBySpecialty(hospitals, specialty) {
    if (specialty === 'all') return hospitals;
    // This function will be implemented when we have specialty data
    return hospitals;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTopHospitals();
    
    // Add event listeners for filters
    const specialtyFilter = document.getElementById('specialtyFilter');
    const sortByFilter = document.getElementById('sortBy');
    
    if (specialtyFilter) {
        specialtyFilter.addEventListener('change', (e) => {
            // Implement specialty filtering when data is available
            console.log('Filtering by specialty:', e.target.value);
        });
    }
    
    if (sortByFilter) {
        sortByFilter.addEventListener('change', (e) => {
            // Implement sorting
            console.log('Sorting by:', e.target.value);
        });
    }
}); 