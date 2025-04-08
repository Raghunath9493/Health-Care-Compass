/**
 * Data Service for HealthCare Compass
 * Handles loading and parsing CSV data
 */

class DataService {
  constructor() {
    this.hospitalsData = [];
    this.rawHospitalEntries = []; // Stores all entries from merged_data.csv
    this.hospitalStats = {}; // Stores statistics for each hospital
    this.dataLoaded = false;
  }

  /**
   * Load hospitals data from merged_data.csv file
   * @returns {Promise} Promise that resolves when data is loaded
   */
  async loadHospitalsData() {
    try {
      // Fix for 404 error - use the correct path to the CSV file
      const response = await fetch('data/merged_data.csv');
      const csvData = await response.text();
      this.rawHospitalEntries = this.parseCSV(csvData);
      
      // Process the raw entries to get unique hospitals with stats
      this.processHospitalData();
      
      this.dataLoaded = true;
      console.log(`Loaded ${this.hospitalsData.length} unique hospitals with ${this.rawHospitalEntries.length} total entries`);
      
      // Generate mock ratings for hospitals
      this.generateMockRatings();
      
      return this.hospitalsData;
    } catch (error) {
      console.error('Error loading hospitals data:', error);
      throw error;
    }
  }

  /**
   * Process raw hospital entries to get unique hospitals with statistics
   */
  processHospitalData() {
    // Create a map to store unique hospitals and their statistics
    const hospitalMap = new Map();
    
    // Process each entry
    this.rawHospitalEntries.forEach(entry => {
      // Skip entries with missing required fields
      if (!entry.NAME || !entry.CITY) {
        console.warn('Skipping entry with missing NAME or CITY:', entry);
        return;
      }
      
      const hospitalKey = `${entry.NAME}-${entry.CITY}`;
      
      if (!hospitalMap.has(hospitalKey)) {
        // Create a new hospital entry
        hospitalMap.set(hospitalKey, {
          NAME: entry.NAME,
          ADDRESS: entry.ADDRESS || '',
          CITY: entry.CITY,
          treatments: {},
          totalCases: 0,
          totalCost: 0,
          averageCost: 0
        });
      }
      
      const hospital = hospitalMap.get(hospitalKey);
      
      // Count this treatment - Fix for TypeError by adding null check
      const treatment = entry.DESCRIPTION ? entry.DESCRIPTION.trim() : 'Unknown Treatment';
      if (!hospital.treatments[treatment]) {
        hospital.treatments[treatment] = {
          count: 0,
          totalCost: 0,
          averageCost: 0
        };
      }
      
      const cost = parseFloat(entry.BASE_ENCOUNTER_COST) || 0;
      hospital.treatments[treatment].count++;
      hospital.treatments[treatment].totalCost += cost;
      hospital.treatments[treatment].averageCost = hospital.treatments[treatment].totalCost / hospital.treatments[treatment].count;
      
      // Update hospital totals
      hospital.totalCases++;
      hospital.totalCost += cost;
      hospital.averageCost = hospital.totalCost / hospital.totalCases;
    });
    
    // Convert map to array and sort by total cases (descending)
    this.hospitalsData = Array.from(hospitalMap.values())
      .sort((a, b) => b.totalCases - a.totalCases);
    
    // Store hospital statistics separately
    this.hospitalStats = this.hospitalsData.reduce((stats, hospital) => {
      stats[`${hospital.NAME}-${hospital.CITY}`] = {
        totalCases: hospital.totalCases,
        totalCost: hospital.totalCost,
        averageCost: hospital.averageCost,
        treatments: hospital.treatments
      };
      return stats;
    }, {});
  }

  /**
   * Get top hospitals based on number of cases treated
   * @param {number} limit - Maximum number of hospitals to return
   * @returns {Array} Top hospitals
   */
  getTopHospitals(limit = 10) {
    return this.hospitalsData.slice(0, limit);
  }

  /**
   * Parse CSV data into array of objects
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Array of objects representing CSV rows
   */
  parseCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      console.error('Invalid CSV data:', csvText);
      return [];
    }
    
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      console.error('CSV data has insufficient lines:', lines.length);
      return [];
    }
    
    const headers = lines[0].split(',');
    if (headers.length < 1) {
      console.error('CSV headers are invalid:', headers);
      return [];
    }
    
    return lines.slice(1)
      .filter(line => line && line.trim() !== '')
      .map(line => {
        const values = this.parseCSVLine(line);
        const entry = {};
        
        headers.forEach((header, index) => {
          // Convert numeric values
          if (header === 'BASE_ENCOUNTER_COST') {
            entry[header] = values[index] ? parseFloat(values[index]) : 0;
          } else {
            entry[header] = values[index] || '';
          }
        });
        
        return entry;
      });
  }

  /**
   * Parse a single CSV line, handling quoted values correctly
   * @param {string} line - CSV line to parse
   * @returns {Array} Array of values
   */
  parseCSVLine(line) {
    if (!line) return [];
    
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue); // Add the last value
    return values;
  }

  /**
   * Search hospitals by name, city, or treatment description
   * @param {string} query - Search query
   * @returns {Array} Filtered hospitals
   */
  searchHospitals(query) {
    if (!query) return this.hospitalsData;
    
    const searchTerms = query.toLowerCase().split(' ');
    
    // First, check if any hospitals match the search terms
    const matchingHospitals = this.hospitalsData.filter(hospital => {
      const searchableText = `${hospital.NAME} ${hospital.CITY}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    });
    
    // If we found matching hospitals, return them
    if (matchingHospitals.length > 0) {
      return matchingHospitals;
    }
    
    // Otherwise, search for treatments
    return this.hospitalsData.filter(hospital => {
      // Check if any treatment matches the search terms
      return Object.keys(hospital.treatments || {}).some(treatment => {
        const treatmentLower = treatment.toLowerCase();
        return searchTerms.some(term => treatmentLower.includes(term));
      });
    });
  }

  /**
   * Filter hospitals by location (city)
   * @param {string} location - Location to filter by
   * @returns {Array} Filtered hospitals
   */
  filterByLocation(location) {
    if (!location) return this.hospitalsData;
    
    const locationLower = location.toLowerCase();
    
    return this.hospitalsData.filter(hospital => 
      hospital.CITY && hospital.CITY.toLowerCase().includes(locationLower)
    );
  }

  /**
   * Search hospitals by treatment description and location
   * @param {string} treatment - Treatment description
   * @param {string} location - Location
   * @returns {Array} Filtered hospitals
   */
  searchByTreatmentAndLocation(treatment, location) {
    let results = this.hospitalsData;
    
    // If both treatment and location are empty, return all hospitals
    if (!treatment && !location) {
      return results;
    }
    
    // Filter by treatment if provided
    if (treatment) {
      const treatmentLower = treatment.toLowerCase();
      results = results.filter(hospital => {
        // Check hospital name
        if (hospital.NAME && hospital.NAME.toLowerCase().includes(treatmentLower)) {
          return true;
        }
        
        // Check hospital description
        if (hospital.DESCRIPTION && hospital.DESCRIPTION.toLowerCase().includes(treatmentLower)) {
          return true;
        }
        
        // Check treatments
        return Object.keys(hospital.treatments || {}).some(t => 
          t.toLowerCase().includes(treatmentLower)
        );
      });
    }
    
    // Filter by location if provided
    if (location) {
      const locationLower = location.toLowerCase();
      results = results.filter(hospital => 
        (hospital.ADDRESS && hospital.ADDRESS.toLowerCase().includes(locationLower)) ||
        (hospital.CITY && hospital.CITY.toLowerCase().includes(locationLower))
      );
    }
    
    return results;
  }

  /**
   * Get treatment cost for a specific hospital and treatment
   * @param {Object} hospital - Hospital object
   * @param {string} treatment - Treatment description
   * @returns {number} Average cost of the treatment
   */
  getTreatmentCost(hospital, treatment) {
    if (!hospital || !hospital.NAME || !hospital.CITY) {
      return 0;
    }
    
    const hospitalKey = `${hospital.NAME}-${hospital.CITY}`;
    const stats = this.hospitalStats[hospitalKey];
    
    if (!stats) return 0;
    
    // If exact treatment is provided
    if (treatment && stats.treatments && stats.treatments[treatment]) {
      return stats.treatments[treatment].averageCost;
    }
    
    // If treatment is provided but not exact match, find closest match
    if (treatment && stats.treatments) {
      const treatmentLower = treatment.toLowerCase();
      const matchingTreatment = Object.keys(stats.treatments).find(t => 
        t.toLowerCase().includes(treatmentLower)
      );
      
      if (matchingTreatment) {
        return stats.treatments[matchingTreatment].averageCost;
      }
    }
    
    // Otherwise return average cost across all treatments
    return stats.averageCost || 0;
  }

  /**
   * Compare hospitals based on treatment costs
   * @param {Array} hospitals - Array of hospitals to compare
   * @param {string} treatment - Treatment description
   * @returns {Array} Hospitals with cost comparison data
   */
  compareHospitalCosts(hospitals, treatment) {
    if (!hospitals || hospitals.length === 0) return [];
    
    const comparisonData = hospitals.map(hospital => {
      const cost = this.getTreatmentCost(hospital, treatment);
      
      return {
        ...hospital,
        cost: cost,
        costCategory: this.getCostCategory(cost, hospitals.map(h => this.getTreatmentCost(h, treatment)))
      };
    });
    
    // Sort by cost (ascending)
    return comparisonData.sort((a, b) => a.cost - b.cost);
  }

  /**
   * Determine cost category (low, medium, high) based on relative costs
   * @param {number} cost - Cost to categorize
   * @param {Array} allCosts - All costs to compare against
   * @returns {string} Cost category ('low', 'medium', or 'high')
   */
  getCostCategory(cost, allCosts) {
    if (cost === undefined || cost === null || allCosts.length === 0) return 'medium';
    
    // Filter out null/undefined values
    const validCosts = allCosts.filter(c => c !== null && c !== undefined);
    if (validCosts.length === 0) return 'medium';
    
    // Sort costs
    const sortedCosts = [...validCosts].sort((a, b) => a - b);
    
    // Determine thresholds
    const lowestCost = sortedCosts[0];
    const highestCost = sortedCosts[sortedCosts.length - 1];
    
    // If all costs are the same
    if (lowestCost === highestCost) return 'medium';
    
    // Calculate range and thresholds
    const range = highestCost - lowestCost;
    const lowThreshold = lowestCost + (range * 0.33);
    const highThreshold = lowestCost + (range * 0.66);
    
    // Categorize
    if (cost <= lowThreshold) return 'low';
    if (cost >= highThreshold) return 'high';
    return 'medium';
  }

  /**
   * Generate mock ratings for hospitals
   * @returns {void}
   */
  generateMockRatings() {
    this.hospitalsData.forEach(hospital => {
      // Generate a random rating between 3.0 and 5.0
      hospital.rating = (3 + Math.random() * 2).toFixed(1);
      // Generate a random number of reviews
      hospital.reviews = Math.floor(50 + Math.random() * 300);
    });
  }

  /**
   * Get unique cities from hospital data
   * @returns {Array} Array of unique city names
   */
  getUniqueCities() {
    const cities = new Set();
    this.hospitalsData.forEach(hospital => {
      if (hospital.CITY) {
        cities.add(hospital.CITY);
      }
    });
    return Array.from(cities).sort();
  }
}

// Create and export a singleton instance
const dataService = new DataService();
