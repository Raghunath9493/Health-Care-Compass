// Function to load and display top hospitals
async function loadTopHospitals() {
    try {
        // Wait for data service to load data
        if (!dataService.dataLoaded) {
            await dataService.loadHospitalsData();
        }
        
        // Get top 10 hospitals based on cases treated
        const topHospitals = dataService.getTopHospitals(10);
        
        // Display top hospitals
        displayTopHospitals(topHospitals);
    } catch (error) {
        console.error('Error loading top hospitals:', error);
        document.getElementById('topHospitalsList').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading hospital data. Please try again later.</p>
            </div>
        `;
    }
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
                <p>${hospital.CITY}</p>
                <p>Total Cases: ${hospital.totalCases}</p>
                <p>Average Cost: $${hospital.averageCost.toFixed(2)}</p>
                <div class="hospital-rating">
                    <i class="fas fa-star"></i>
                    <span>${hospital.rating || '4.0'}</span>
                    <span class="reviews">(${hospital.reviews || '100'} reviews)</span>
                </div>
            </div>
            <div class="hospital-contact">
                <p><i class="fas fa-map-marker-alt"></i> ${hospital.ADDRESS}</p>
                <div class="hospital-actions">
                    <button class="btn btn-primary view-details-btn" data-hospital="${hospital.NAME}" data-city="${hospital.CITY}">View Details</button>
                </div>
            </div>
        </div>
    `).join('');

    topHospitalsList.innerHTML = html;
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', () => {
            const hospitalName = button.getAttribute('data-hospital');
            const hospitalCity = button.getAttribute('data-city');
            showHospitalDetails(hospitalName, hospitalCity);
        });
    });
}

// Function to show hospital details
function showHospitalDetails(hospitalName, hospitalCity) {
    // Find the hospital in the data
    const hospital = dataService.hospitalsData.find(h => 
        h.NAME === hospitalName && h.CITY === hospitalCity
    );
    
    if (!hospital) return;
    
    // Get the modal element
    const modal = document.getElementById('hospitalDetailsModal');
    if (!modal) {
        // Create modal if it doesn't exist
        createHospitalDetailsModal();
    }
    
    // Update modal content
    const modalTitle = document.getElementById('hospitalDetailsTitle');
    const modalBody = document.getElementById('hospitalDetailsBody');
    
    if (modalTitle) modalTitle.textContent = hospital.NAME;
    
    if (modalBody) {
        // Get treatments sorted by count (most common first)
        const treatments = Object.entries(hospital.treatments)
            .sort((a, b) => b[1].count - a[1].count);
        
        // Create treatments HTML
        const treatmentsHtml = treatments.map(([treatment, stats]) => `
            <tr>
                <td>${treatment}</td>
                <td>${stats.count}</td>
                <td>$${stats.averageCost.toFixed(2)}</td>
            </tr>
        `).join('');
        
        modalBody.innerHTML = `
            <div class="hospital-details-info">
                <p><strong>Address:</strong> ${hospital.ADDRESS}, ${hospital.CITY}</p>
                <p><strong>Total Cases:</strong> ${hospital.totalCases}</p>
                <p><strong>Average Cost:</strong> $${hospital.averageCost.toFixed(2)}</p>
                <p><strong>Rating:</strong> ${hospital.rating} (${hospital.reviews} reviews)</p>
            </div>
            
            <h5>Treatments</h5>
            <div class="treatments-table-container">
                <table class="treatments-table">
                    <thead>
                        <tr>
                            <th>Treatment</th>
                            <th>Cases</th>
                            <th>Avg. Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${treatmentsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Show the modal
    $('#hospitalDetailsModal').modal('show');
}

// Function to create hospital details modal
function createHospitalDetailsModal() {
    // Create modal element
    const modalHtml = `
        <div class="modal fade" id="hospitalDetailsModal" tabindex="-1" role="dialog" aria-labelledby="hospitalDetailsTitle" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="hospitalDetailsTitle"></h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body" id="hospitalDetailsBody">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Function to sort hospitals
function sortHospitals(hospitals, sortBy) {
    switch(sortBy) {
        case 'name':
            return [...hospitals].sort((a, b) => a.NAME.localeCompare(b.NAME));
        case 'city':
            return [...hospitals].sort((a, b) => a.CITY.localeCompare(b.CITY));
        case 'cost-low':
            return [...hospitals].sort((a, b) => a.averageCost - b.averageCost);
        case 'cost-high':
            return [...hospitals].sort((a, b) => b.averageCost - a.averageCost);
        case 'rating':
            return [...hospitals].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        case 'cases':
        default:
            return [...hospitals].sort((a, b) => b.totalCases - a.totalCases);
    }
}

// Function to filter hospitals by treatment type
function filterHospitalsByTreatment(hospitals, treatment) {
    if (!treatment || treatment === 'all') return hospitals;
    
    return hospitals.filter(hospital => {
        return Object.keys(hospital.treatments).some(t => 
            t.toLowerCase().includes(treatment.toLowerCase())
        );
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load data service script first
    const dataServiceScript = document.createElement('script');
    dataServiceScript.src = './data-service.js';
    dataServiceScript.onload = () => {
        // After data service is loaded, load top hospitals
        loadTopHospitals();
    };
    document.head.appendChild(dataServiceScript);
    
    // Add event listeners for filters
    const treatmentFilter = document.getElementById('treatmentFilter');
    const sortByFilter = document.getElementById('sortBy');
    
    if (treatmentFilter) {
        treatmentFilter.addEventListener('change', (e) => {
            const treatment = e.target.value;
            const sortBy = sortByFilter ? sortByFilter.value : 'cases';
            
            // Get top hospitals, filter by treatment, then sort
            let hospitals = dataService.getTopHospitals(50); // Get more to filter from
            hospitals = filterHospitalsByTreatment(hospitals, treatment);
            hospitals = sortHospitals(hospitals, sortBy);
            
            // Display top 10 after filtering
            displayTopHospitals(hospitals.slice(0, 10));
        });
    }
    
    if (sortByFilter) {
        sortByFilter.addEventListener('change', (e) => {
            const sortBy = e.target.value;
            const treatment = treatmentFilter ? treatmentFilter.value : 'all';
            
            // Get top hospitals, filter by treatment, then sort
            let hospitals = dataService.getTopHospitals(50); // Get more to filter from
            hospitals = filterHospitalsByTreatment(hospitals, treatment);
            hospitals = sortHospitals(hospitals, sortBy);
            
            // Display top 10 after filtering
            displayTopHospitals(hospitals.slice(0, 10));
        });
    }
});
