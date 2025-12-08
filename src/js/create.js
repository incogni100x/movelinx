import { requireAdminAuth } from './session.js';
import { handleLogout } from './logout.js';
import { supabase } from './client.js';

// Helper function to get form value
function getFormValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : '';
}

// Helper function to get form number value
function getFormNumberValue(id) {
  const value = getFormValue(id);
  return value === '' ? null : parseFloat(value);
}

// Helper function to get form date value
function getFormDateValue(id) {
  const value = getFormValue(id);
  return value === '' ? null : value;
}

// Collect and map form data to database schema
function collectFormData() {
  const formData = {
    // Sender Information
    sender_name: getFormValue('sender-name'),
    sender_phone: getFormValue('sender-phone'),
    sender_email: getFormValue('sender-email') || null,
    sender_street: getFormValue('sender-street'),
    sender_city: getFormValue('sender-city'),
    sender_country: getFormValue('sender-country'),
    
    // Receiver Information
    receiver_name: getFormValue('receiver-name'),
    receiver_phone: getFormValue('receiver-phone'),
    receiver_street: getFormValue('receiver-street'),
    receiver_city: getFormValue('receiver-city'),
    receiver_country: getFormValue('receiver-country'),
    
    // Package Details
    package_type: getFormValue('package-type'),
    weight_kg: getFormNumberValue('weight'),
    length_cm: getFormNumberValue('length'),
    width_cm: getFormNumberValue('width'),
    height_cm: getFormNumberValue('height'),
    declared_value_usd: getFormNumberValue('declared-value'),
    
    // Payment Information
    invoice_number: getFormValue('invoice-number') || null,
    payment_status: getFormValue('payment-status') || null,
    payment_method: getFormValue('payment-method') || null,
    payment_date: getFormDateValue('payment-date'),
    shipping_cost_yen: getFormNumberValue('shipping-cost'),
    insurance_yen: getFormNumberValue('insurance'),
    taxes_yen: getFormNumberValue('taxes'),
    additional_fees_usd: getFormNumberValue('additional-fees'),
    total_amount_yen: getFormNumberValue('total-amount'),
    
    // Customs Clearance Information
    clearance_status: getFormValue('clearance-status') || null,
    declaration_number: getFormValue('declaration-number') || null,
    clearance_notes: getFormValue('clearance-notes') || null,
  };
  
  return formData;
}

// Validate form data
function validateFormData(data) {
  const errors = [];
  
  // Required fields
  if (!data.sender_name) errors.push('Sender name is required');
  if (!data.sender_phone) errors.push('Sender phone is required');
  if (!data.sender_street) errors.push('Sender street address is required');
  if (!data.sender_city) errors.push('Sender city is required');
  if (!data.sender_country) errors.push('Sender country is required');
  
  if (!data.receiver_name) errors.push('Receiver name is required');
  if (!data.receiver_phone) errors.push('Receiver phone is required');
  if (!data.receiver_street) errors.push('Receiver street address is required');
  if (!data.receiver_city) errors.push('Receiver city is required');
  if (!data.receiver_country) errors.push('Receiver country is required');
  
  if (!data.package_type) errors.push('Package type is required');
  
  return errors;
}

// Show error message
function showError(message) {
  // Remove any existing error messages
  const existingError = document.getElementById('form-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.id = 'form-error';
  errorDiv.className = 'mb-4 rounded-md bg-red-50 p-4';
  errorDiv.innerHTML = `
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">${message}</h3>
      </div>
    </div>
  `;
  
  // Insert error message before the form
  const form = document.getElementById('create-shipment-form');
  if (form && form.parentElement) {
    form.parentElement.insertBefore(errorDiv, form);
    // Scroll to error
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Hide error message
function hideError() {
  const existingError = document.getElementById('form-error');
  if (existingError) {
    existingError.remove();
  }
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format package type for display
function formatPackageType(type) {
  if (!type) return 'N/A';
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Show success modal with shipment details
function showSuccessModal(shipment, formData) {
  const modal = document.getElementById('success-modal');
  if (!modal) return;
  
  // Populate modal with shipment data
  const trackingIdEl = document.getElementById('success-tracking-id');
  const statusEl = document.getElementById('success-status');
  const createdAtEl = document.getElementById('success-created-at');
  const senderEl = document.getElementById('success-sender');
  const receiverEl = document.getElementById('success-receiver');
  const packageTypeEl = document.getElementById('success-package-type');
  const weightEl = document.getElementById('success-weight');
  
  if (trackingIdEl) {
    trackingIdEl.textContent = shipment.tracking_id || 'N/A';
  }
  
  if (statusEl) {
    statusEl.textContent = shipment.status || 'Processing';
  }
  
  if (createdAtEl) {
    createdAtEl.textContent = formatDate(shipment.created_at);
  }
  
  if (senderEl) {
    senderEl.textContent = `${formData.sender_name || 'N/A'}, ${formData.sender_city || 'N/A'}`;
  }
  
  if (receiverEl) {
    receiverEl.textContent = `${formData.receiver_name || 'N/A'}, ${formData.receiver_city || 'N/A'}`;
  }
  
  if (packageTypeEl) {
    packageTypeEl.textContent = formatPackageType(shipment.package_type || formData.package_type);
  }
  
  if (weightEl) {
    const weight = shipment.weight_kg || formData.weight_kg;
    weightEl.textContent = weight ? `${weight} kg` : 'N/A';
  }
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Store shipment ID for view button
  modal.dataset.shipmentId = shipment.id;
}

// Hide success modal
function hideSuccessModal() {
  const modal = document.getElementById('success-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Insert shipment into database
async function createShipment(formData) {
  try {
    // Insert shipment
    const { data, error } = await supabase
      .from('shipments')
      .insert([formData])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Create initial timeline entry for "Processing" status with default location
    if (data && data.id) {
      const defaultLocation = formData.sender_city ? `${formData.sender_city} Sorting Center` : 'Origin Sorting Center';
      const defaultNotes = 'Shipment created and processed';
      
      await supabase
        .from('shipment_timeline')
        .insert([{
          shipment_id: data.id,
          status: 'Processing',
          location: defaultLocation,
          notes: defaultNotes
        }]);
    }
    
    return data;
  } catch (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
}

// Mobile sidebar toggle
function setupEventListeners() {
  const openSidebarBtn = document.getElementById('open-sidebar-button');
  const closeSidebarBtn = document.getElementById('close-sidebar-button');
  const sidebarBackdrop = document.getElementById('mobile-sidebar-backdrop');
  const mobileSidebar = document.getElementById('mobile-sidebar');
  
  if (openSidebarBtn && mobileSidebar) {
    openSidebarBtn.addEventListener('click', function() {
      mobileSidebar.classList.remove('hidden');
    });
  }

  if (closeSidebarBtn && mobileSidebar) {
    closeSidebarBtn.addEventListener('click', function() {
      mobileSidebar.classList.add('hidden');
    });
  }

  if (sidebarBackdrop && mobileSidebar) {
    sidebarBackdrop.addEventListener('click', function() {
      mobileSidebar.classList.add('hidden');
    });
  }

  // Logout functionality
  const logoutButtons = [
    document.getElementById('mobile-logout-button'),
    document.getElementById('desktop-logout-button')
  ];

  logoutButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', async function() {
        await handleLogout();
      });
    }
  });
  
  // Form submission
  const createForm = document.getElementById('create-shipment-form');
  if (createForm) {
    createForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Hide any previous errors
      hideError();
      
      // Collect form data
      const formData = collectFormData();
      
      // Validate form data
      const validationErrors = validateFormData(formData);
      if (validationErrors.length > 0) {
        showError(validationErrors.join(', '));
        return;
      }
      
      // Show loading state
      const submitButton = document.getElementById('submit-button');
      if (!submitButton) return;
      
      const originalText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating...
      `;
      
      try {
        // Insert shipment into database
        const shipment = await createShipment(formData);
        
        if (shipment) {
          // Reset form
          createForm.reset();
          
          // Reset button
          submitButton.disabled = false;
          submitButton.textContent = originalText;
          
          // Show success modal with shipment details
          showSuccessModal(shipment, formData);
        } else {
          throw new Error('Failed to create shipment');
        }
      } catch (error) {
        console.error('Error creating shipment:', error);
        
        // Show error message
        let errorMessage = 'Failed to create shipment. Please try again.';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        }
        showError(errorMessage);
        
        // Reset button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  }
  
  // Cancel button
  const cancelButton = document.getElementById('cancel-button');
  if (cancelButton) {
    cancelButton.addEventListener('click', function() {
      window.location.href = '/admin/shipments';
    });
  }
  
  // Success modal event listeners
  const successModal = document.getElementById('success-modal');
  const successModalBackdrop = document.getElementById('success-modal-backdrop');
  const closeSuccessModalBtn = document.getElementById('close-success-modal');
  const viewShipmentBtn = document.getElementById('view-shipment-button');
  
  if (successModalBackdrop) {
    successModalBackdrop.addEventListener('click', function() {
      hideSuccessModal();
      window.location.href = '/admin/shipments';
    });
  }
  
  if (closeSuccessModalBtn) {
    closeSuccessModalBtn.addEventListener('click', function() {
      hideSuccessModal();
      window.location.href = '/admin/shipments';
    });
  }
  
  if (viewShipmentBtn) {
    viewShipmentBtn.addEventListener('click', function() {
      const shipmentId = successModal?.dataset.shipmentId;
      if (shipmentId) {
        window.location.href = `/admin/shipment-details?id=${shipmentId}`;
      } else {
        window.location.href = '/admin/shipments';
      }
    });
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
  // Require authentication - will redirect if not authenticated
  await requireAdminAuth({ redirectTo: '/admin-login' });
  
  // Set up event listeners
  setupEventListeners();
});

