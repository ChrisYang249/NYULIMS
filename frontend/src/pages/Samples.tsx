import { useState, useEffect } from 'react';
import { 
  Table, Button, Tag, Space, message, Modal, Form, Select, 
  InputNumber, Input, Divider, Row, Col, Card, Upload,
  Tabs, Alert, Popover, Typography, Dropdown, Popconfirm,
  DatePicker, Switch, Checkbox
} from 'antd';
import type { UploadProps, ColumnsType } from 'antd';
import { 
  PlusOutlined, BarcodeOutlined, UploadOutlined,
  SaveOutlined, EditOutlined, ReloadOutlined,
  DownloadOutlined, EnvironmentOutlined,
  FileTextOutlined, CheckCircleOutlined, DeleteOutlined,
  SearchOutlined, FilterOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePermissions } from '../hooks/usePermissions';
import { Link, useSearchParams } from 'react-router-dom';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// Helper function to format depth in M reads
const formatDepth = (depthM: number | null | undefined): string => {
  if (!depthM) return '-';
  return `${depthM}M`;
};

// Helper function to convert M reads to GB (1GB = 6.6M reads) - for forms
const formatDepthWithGB = (depthM: number | null | undefined): string => {
  if (!depthM) return '-';
  const gb = (depthM / 6.6).toFixed(1);
  return `${depthM}M (${gb}GB)`;
};

// Helper function to abbreviate institution names
const abbreviateInstitution = (institution: string): string => {
  if (!institution) return '-';
  
  // Common abbreviations
  const abbreviations: Record<string, string> = {
    'university': 'U',
    'institute': 'Inst',
    'hospital': 'Hosp',
    'medical center': 'MC',
    'research center': 'RC',
    'laboratory': 'Lab',
    'laboratories': 'Labs',
    'college': 'Col',
    'foundation': 'Found',
    'corporation': 'Corp',
    'company': 'Co',
    'department': 'Dept',
    'center': 'Ctr',
    'national': 'Natl',
    'international': 'Intl',
  };
  
  let abbreviated = institution;
  
  // Replace common words with abbreviations
  Object.entries(abbreviations).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    abbreviated = abbreviated.replace(regex, abbr);
  });
  
  // If still too long, show first word + abbreviation
  if (abbreviated.length > 20) {
    const words = abbreviated.split(' ');
    if (words.length > 1) {
      abbreviated = words[0] + ' ' + words.slice(1).map(w => w[0]).join('');
    }
  }
  
  return abbreviated;
};

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  project_id: number;
  project_name: string;
  project_code: string;  // The CMBP ID
  client_institution: string;
  sample_type: string;
  sample_type_other?: string;
  service_type?: string;
  status: string;
  target_depth: number;
  well_location: string;
  due_date: string;
  created_at: string;
  storage_location?: any;
  extraction_kit?: string;
  extraction_lot?: string;
  dna_concentration_ng_ul?: number;
  library_prep_kit?: string;
  library_prep_lot?: string;
  library_concentration_ng_ul?: number;
  sequencing_run_id?: string;
  sequencing_instrument?: string;
  achieved_depth?: number;
}

interface Project {
  id: number;
  project_id: string;  // The actual CMBP ID
  name: string;
  project_type?: string;  // WGS, V1V3_16S, etc.
  client: {
    name: string;
    institution: string;
  };
  due_date: string;
}

interface StorageLocation {
  id: number;
  freezer: string;
  shelf: string;
  box: string;
  position?: string;
}

const Samples = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [sampleTypes, setSampleTypes] = useState<{value: number; label: string; name: string; requires_description: boolean}[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isBulkRegister, setIsBulkRegister] = useState(false);
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkSamples, setBulkSamples] = useState<any[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [expandedView, setExpandedView] = useState(false);
  const [isBulkStatusModalVisible, setIsBulkStatusModalVisible] = useState(false);
  const [deletingSampleId, setDeletingSampleId] = useState<number | null>(null);
  
  // Initialize filter states from URL params
  const [searchText, setSearchText] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string[]>(
    searchParams.get('status') ? searchParams.get('status')!.split(',') : []
  );
  const [sampleTypeFilter, setSampleTypeFilter] = useState<string[]>(
    searchParams.get('type') ? searchParams.get('type')!.split(',') : []
  );
  const [projectFilter, setProjectFilter] = useState<number[]>(
    searchParams.get('project') ? searchParams.get('project')!.split(',').map(Number) : []
  );
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>(() => {
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    return [start ? dayjs(start) : null, end ? dayjs(end) : null];
  });
  const [showDeleted, setShowDeleted] = useState(searchParams.get('deleted') === 'true');
  
  // Pagination state
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || 50);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  
  // Upload validation states
  const [isValidationModalVisible, setIsValidationModalVisible] = useState(false);
  const [parsedSamples, setParsedSamples] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  
  const { canPerform } = usePermissions();

  // Update URL params when filters change
  const updateURLParams = (updates: Record<string, any>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.set(key, value.join(','));
      } else {
        newParams.set(key, String(value));
      }
    });
    
    setSearchParams(newParams);
  };

  // Utility function to clean sample names
  const cleanSampleName = (name: string): string => {
    if (!name) return name;
    
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace special chars and whitespace with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single underscore
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  // Parse uploaded file (CSV or XLSX)
  const parseUploadedFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let samples: any[] = [];
          
          if (file.name.toLowerCase().endsWith('.xlsx')) {
            // Parse XLSX file
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0]; // Use first sheet
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            samples = jsonData.map((row: any) => ({
              project_id: String(row.project_id || ''),
              client_sample_id: row.client_sample_id ? String(row.client_sample_id) : null,
              sample_type: String(row.sample_type || ''),
              service_type: row.service_type ? String(row.service_type) : null,
              target_depth: row.target_depth ? Number(row.target_depth) : null,
              well_location: row.well_location ? String(row.well_location) : null,
              storage_freezer: row.storage_freezer ? String(row.storage_freezer) : null,
              storage_shelf: row.storage_shelf ? String(row.storage_shelf) : null,
              storage_box: row.storage_box ? String(row.storage_box) : null,
              storage_position: row.storage_position ? String(row.storage_position) : null,
            }));
          } else {
            // Parse CSV file
            const text = data as string;
            const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
            if (lines.length < 2) throw new Error('CSV file must have headers and at least one data row');
            
            const headers = lines[0].split(',').map(h => h.trim());
            
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const sample: any = {};
                
                headers.forEach((header, index) => {
                  const value = values[index]?.trim();
                  if (!value) {
                    sample[header] = null;
                  } else if (header === 'target_depth') {
                    sample[header] = Number(value);
                  } else {
                    sample[header] = value;
                  }
                });
                samples.push(sample);
              }
            }
          }
          
          resolve(samples);
        } catch (error) {
          reject(new Error(`Failed to parse ${file.name}: ${error}`));
        }
      };
      
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Validate parsed samples
  const validateSamples = (samples: any[]) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const cleanedSamples: any[] = [];
    const projectIds = projects.map(p => p.project_id);
    const sampleTypeNames = sampleTypes.map(t => t.name);
    
    samples.forEach((sample, index) => {
      const rowNum = index + 2; // Account for header row
      const cleanedSample = { ...sample };
      
      // Validate required fields
      if (!sample.project_id) {
        errors.push(`Row ${rowNum}: project_id is required`);
      } else if (!projectIds.includes(sample.project_id)) {
        errors.push(`Row ${rowNum}: Invalid project_id "${sample.project_id}". Valid projects: ${projectIds.slice(0, 5).join(', ')}${projectIds.length > 5 ? '...' : ''}`);
      }
      
      if (!sample.sample_type) {
        errors.push(`Row ${rowNum}: sample_type is required`);
      } else if (!sampleTypeNames.includes(sample.sample_type)) {
        errors.push(`Row ${rowNum}: Invalid sample_type "${sample.sample_type}". Check Valid Sample Types.`);
      }
      
      // Clean client sample ID
      if (sample.client_sample_id) {
        const originalId = sample.client_sample_id;
        const cleanedId = cleanSampleName(originalId);
        
        if (originalId !== cleanedId) {
          cleanedSample.client_sample_id = cleanedId;
          warnings.push(`Row ${rowNum}: Client Sample ID cleaned from "${originalId}" to "${cleanedId}"`);
        }
      }
      
      // Validate service type if provided
      if (sample.service_type) {
        const validServiceTypes = ['WGS', 'V1V3_16S', 'V3V4_16S', 'ONT_WGS', 'ONT_V1V8', 'ANALYSIS_ONLY', 'INTERNAL', 'CLINICAL', 'OTHER'];
        if (!validServiceTypes.includes(sample.service_type)) {
          errors.push(`Row ${rowNum}: Invalid service_type "${sample.service_type}". Valid types: ${validServiceTypes.join(', ')}`);
        } else if (sample.project_id) {
          // Check if service type matches project type
          const project = projects.find(p => p.project_id === sample.project_id);
          if (project && project.project_type && sample.service_type !== project.project_type) {
            warnings.push(`Row ${rowNum}: Service type "${sample.service_type}" does not match project type "${project.project_type}"`);
          }
        }
      }
      
      // Validate DNA plate well location
      if (sample.sample_type === 'dna_plate' && !sample.well_location) {
        errors.push(`Row ${rowNum}: well_location is required for dna_plate samples`);
      }
      
      // Validate target depth
      if (sample.target_depth && isNaN(Number(sample.target_depth))) {
        errors.push(`Row ${rowNum}: target_depth must be a number`);
      }
      
      cleanedSamples.push(cleanedSample);
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanedSamples,
      totalSamples: samples.length
    };
  };

  const fetchSamples = async (includeDeleted?: boolean) => {
    setLoading(true);
    try {
      const params: any = {};
      // Use parameter if provided, otherwise use state
      const shouldIncludeDeleted = includeDeleted !== undefined ? includeDeleted : showDeleted;
      if (shouldIncludeDeleted) params.include_deleted = true;
      // Don't send filters to backend since we're doing client-side filtering
      // This allows us to support multi-select
      
      const response = await api.get('/samples', { params });
      setSamples(response.data);
    } catch (error) {
      message.error('Failed to fetch samples');
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?status=lab');
      setProjects(response.data);
    } catch (error) {
      message.error('Failed to fetch projects');
    }
  };

  const fetchStorageLocations = async () => {
    try {
      const response = await api.get('/samples/storage/locations');
      setStorageLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch storage locations');
    }
  };

  const fetchSampleTypes = async () => {
    try {
      const response = await api.get('/sample-types');
      // Transform the response to match the expected format
      const types = response.data.map((st: any) => ({
        value: st.id,  // Use ID as value
        label: st.display_name,
        name: st.name,
        requires_description: st.requires_description
      }));
      setSampleTypes(types);
    } catch (error) {
      console.error('Failed to fetch sample types');
      // Use hardcoded list as fallback
      setSampleTypes(sampleTypesFallback);
    }
  };

  useEffect(() => {
    // Initial fetch with URL param value
    fetchSamples(searchParams.get('deleted') === 'true');
    fetchProjects();
    fetchStorageLocations();
    fetchSampleTypes();
  }, []);

  useEffect(() => {
    // Only refetch when showDeleted changes, not for other filters
    fetchSamples(showDeleted);
  }, [showDeleted]);

  const statusColors: Record<string, string> = {
    REGISTERED: 'default',
    RECEIVED: 'blue',
    ACCESSIONED: 'cyan',
    IN_EXTRACTION: 'lime',
    EXTRACTED: 'green',
    IN_LIBRARY_PREP: 'gold',
    LIBRARY_PREPPED: 'orange',
    IN_SEQUENCING: 'purple',
    SEQUENCED: 'magenta',
    IN_ANALYSIS: 'geekblue',
    ANALYSIS_COMPLETE: 'cyan',
    DELIVERED: 'success',
    FAILED: 'error',
    CANCELLED: 'default',
    DELETED: 'default'
  };

  const sampleTypesFallback = [
    { value: 'abscess', label: 'Abscess' },
    { value: 'air_filter_fluid', label: 'Air Filter Fluid' },
    { value: 'amniotic_fluid', label: 'Amniotic Fluid' },
    { value: 'animal_wound_swabs', label: 'Animal wound swabs' },
    { value: 'bacterial_biofilms', label: 'Bacterial Biofilms' },
    { value: 'bal', label: 'BAL' },
    { value: 'biofilm_cultured', label: 'Biofilm Cultured' },
    { value: 'biofluids', label: 'Biofluids' },
    { value: 'biopsy_extract', label: 'Biopsy Extract' },
    { value: 'blood', label: 'Blood' },
    { value: 'breast_milk', label: 'Breast Milk' },
    { value: 'buccal_swab', label: 'Buccal Swab' },
    { value: 'buffer', label: 'Buffer' },
    { value: 'capsule', label: 'Capsule' },
    { value: 'carcass_swab', label: 'Carcass Swab' },
    { value: 'cdna', label: 'cDNA' },
    { value: 'cecum', label: 'Cecum' },
    { value: 'control', label: 'Control' },
    { value: 'cow_rumen', label: 'Cow Rumen' },
    { value: 'dna', label: 'DNA' },
    { value: 'dna_cdna', label: 'DNA + cDNA' },
    { value: 'dna_library', label: 'DNA Library' },
    { value: 'dna_plate', label: 'DNA Plate' },
    { value: 'environmental_sample', label: 'Environmental Sample' },
    { value: 'environmental_swab', label: 'Environmental Swab' },
    { value: 'enzymes', label: 'Enzymes' },
    { value: 'equipment_swabs', label: 'Equipment swabs' },
    { value: 'fecal_swab', label: 'Fecal Swab' },
    { value: 'ffpe_block', label: 'FFPE Block' },
    { value: 'filter', label: 'Filter' },
    { value: 'food_product', label: 'Food Product' },
    { value: 'hair', label: 'Hair' },
    { value: 'icellpellet', label: 'ICellPellet' },
    { value: 'isolate', label: 'Isolate' },
    { value: 'library_pool', label: 'Library Pool' },
    { value: 'liquid', label: 'Liquid' },
    { value: 'lyophilized_powder', label: 'Lyophilized powder' },
    { value: 'mcellpellet', label: 'MCellPellet' },
    { value: 'media', label: 'Media' },
    { value: 'milk', label: 'Milk' },
    { value: 'mock_community_standard', label: 'Mock Community Standard' },
    { value: 'mucosa', label: 'Mucosa' },
    { value: 'nasal_sample', label: 'Nasal Sample' },
    { value: 'nasal_swab', label: 'Nasal Swab' },
    { value: 'ocular_swab', label: 'Ocular Swab' },
    { value: 'oral_sample', label: 'Oral Sample' },
    { value: 'oral_swab', label: 'Oral Swab' },
    { value: 'other', label: 'Other' },
    { value: 'paper_points', label: 'Paper Points' },
    { value: 'plaque', label: 'Plaque' },
    { value: 'plant', label: 'Plant' },
    { value: 'plasma', label: 'Plasma' },
    { value: 'plasma_tumor', label: 'Plasma/Tumor' },
    { value: 'probiotic', label: 'Probiotic' },
    { value: 'rectal_swab', label: 'Rectal Swab' },
    { value: 'rna', label: 'RNA' },
    { value: 'rna_library', label: 'RNA Library' },
    { value: 'rumen_fluid_pellet', label: 'Rumen Fluid Pellet' },
    { value: 'saliva', label: 'Saliva' },
    { value: 'sea_mucilage', label: 'Sea Mucilage' },
    { value: 'skin_strip', label: 'Skin Strip' },
    { value: 'skin_swab', label: 'Skin Swab' },
    { value: 'soil', label: 'Soil' },
    { value: 'speciality', label: 'Speciality' },
    { value: 'sputum', label: 'Sputum' },
    { value: 'stool', label: 'Stool' },
    { value: 'swab', label: 'Swab' },
    { value: 'tissue', label: 'Tissue' },
    { value: 'tumor_samples', label: 'Tumor Samples' },
    { value: 'urine', label: 'Urine' },
    { value: 'vaginal_swab', label: 'Vaginal Swab' },
    { value: 'vitreous_wash_sample', label: 'Vitreous Wash sample' },
    { value: 'wastewater', label: 'Wastewater' },
    { value: 'water', label: 'Water' },
    { value: 'wound_swab', label: 'Wound Swab' }
  ];

  const statusOptions = [
    { value: 'REGISTERED', label: 'Registered' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'ACCESSIONED', label: 'Accessioned' },
    { value: 'IN_EXTRACTION', label: 'In Extraction' },
    { value: 'EXTRACTED', label: 'Extracted' },
    { value: 'IN_LIBRARY_PREP', label: 'In Library Prep' },
    { value: 'LIBRARY_PREPPED', label: 'Library Prepped' },
    { value: 'IN_SEQUENCING', label: 'In Sequencing' },
    { value: 'SEQUENCED', label: 'Sequenced' },
    { value: 'IN_ANALYSIS', label: 'In Analysis' },
    { value: 'ANALYSIS_COMPLETE', label: 'Analysis Complete' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  const handleBulkCountChange = (count: number) => {
    setBulkCount(count);
    const newSamples = Array(count).fill(null).map((_, index) => ({
      client_sample_id: '',
      target_depth: null,
      well_location: '',
      storage_location_id: null
    }));
    setBulkSamples(newSamples);
  };

  const handleRegisterSubmit = async (values: any) => {
    try {
      // Transform the values to use sample_type_id
      const submitData = {
        ...values,
        sample_type_id: values.sample_type,  // sample_type now contains the ID
      };
      delete submitData.sample_type;  // Remove the old field
      
      if (isBulkRegister) {
        // Bulk registration
        const bulkData = {
          count: bulkCount,
          project_id: submitData.project_id,
          sample_type_id: submitData.sample_type_id,
          samples: bulkSamples
        };
        
        const response = await api.post('/samples/bulk', bulkData);
        message.success(`Successfully registered ${response.data.length} samples`);
      } else {
        // Single registration
        const response = await api.post('/samples', submitData);
        message.success(`Sample registered with barcode: ${response.data.barcode}`);
      }
      
      setIsRegisterModalVisible(false);
      form.resetFields();
      setBulkSamples([]);
      fetchSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to register sample(s)');
    }
  };

  const handleAccession = async (sampleId: number) => {
    try {
      await api.patch(`/samples/${sampleId}/accession`, {});
      message.success('Sample accessioned successfully');
      fetchSamples();
    } catch (error) {
      message.error('Failed to accession sample');
    }
  };

  const handleBulkStatusUpdate = async (values: any) => {
    try {
      // Use the bulk update endpoint
      await api.post('/samples/bulk-update', {
        sample_ids: selectedSamples,
        update_data: {
          status: values.status,
          queue_notes: values.notes
        }
      });
      
      message.success(`${selectedSamples.length} samples updated to ${values.status.replace('_', ' ')}`);
      setSelectedSamples([]);
      setIsBulkStatusModalVisible(false);
      statusForm.resetFields();
      fetchSamples();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to update samples');
      }
    }
  };

  const handleDeleteSample = async (sampleId: number, reason: string) => {
    try {
      if (sampleId === -1) {
        // Bulk delete using the bulk endpoint
        await api.post(`/samples/bulk-delete?deletion_reason=${encodeURIComponent(reason)}`, selectedSamples);
        message.success(`${selectedSamples.length} samples marked as deleted`);
        setSelectedSamples([]);
      } else {
        // Single delete
        await api.delete(`/samples/${sampleId}?deletion_reason=${encodeURIComponent(reason)}`);
        message.success('Sample marked as deleted');
      }
      setDeletingSampleId(null);  // Close the modal
      deleteForm.resetFields();    // Reset the form
      fetchSamples();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to delete sample(s)');
      }
    }
  };

  const downloadExcelTemplate = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Sample data with example project IDs (no real project data for security)
    const sampleData = [
      {
        project_id: 'CMBP00001',
        client_sample_id: 'SAMPLE001',
        sample_type: 'stool',
        service_type: 'WGS',
        target_depth: 30,
        well_location: '',
        storage_freezer: 'Freezer1',
        storage_shelf: 'Shelf1',
        storage_box: 'Box1',
        storage_position: 'A1'
      },
      {
        project_id: 'CMBP00001',
        client_sample_id: 'SAMPLE002',
        sample_type: 'dna_plate',
        service_type: 'V3V4_16S',
        target_depth: 50,
        well_location: 'A1',
        storage_freezer: 'Freezer1',
        storage_shelf: 'Shelf1',
        storage_box: 'Box1',
        storage_position: 'A2'
      }
    ];
    
    // Create samples sheet
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // project_id
      { wch: 20 }, // client_sample_id
      { wch: 15 }, // sample_type
      { wch: 15 }, // service_type
      { wch: 12 }, // target_depth
      { wch: 12 }, // well_location
      { wch: 15 }, // storage_freezer
      { wch: 12 }, // storage_shelf
      { wch: 12 }, // storage_box
      { wch: 15 }, // storage_position
    ];
    
    // Add the samples sheet
    XLSX.utils.book_append_sheet(wb, ws, 'Samples');
    
    // Sample Types sheet (keep this for reference)
    const sampleTypesData = sampleTypes.map(t => ({ sample_type: t.name, label: t.label }));
    const wsSampleTypes = XLSX.utils.json_to_sheet(sampleTypesData);
    XLSX.utils.book_append_sheet(wb, wsSampleTypes, 'Valid Sample Types');
    
    // Service Types sheet for reference
    const serviceTypesData = [
      { service_type: 'WGS', description: 'Whole Genome Sequencing' },
      { service_type: 'V1V3_16S', description: '16S V1-V3 Region Sequencing' },
      { service_type: 'V3V4_16S', description: '16S V3-V4 Region Sequencing' },
      { service_type: 'ONT_WGS', description: 'Oxford Nanopore Whole Genome Sequencing' },
      { service_type: 'ONT_V1V8', description: 'Oxford Nanopore V1-V8 16S Sequencing' },
      { service_type: 'ANALYSIS_ONLY', description: 'Analysis Only (no sequencing)' },
      { service_type: 'INTERNAL', description: 'Internal Project' },
      { service_type: 'CLINICAL', description: 'Clinical Sequencing' },
      { service_type: 'OTHER', description: 'Other Service Type' }
    ];
    const wsServiceTypes = XLSX.utils.json_to_sheet(serviceTypesData);
    XLSX.utils.book_append_sheet(wb, wsServiceTypes, 'Valid Service Types');
    
    // Instructions sheet
    const instructionsData = [
      { Instructions: 'SAMPLE IMPORT TEMPLATE' },
      { Instructions: '' },
      { Instructions: 'How to use this template:' },
      { Instructions: '1. Fill in the sample data in the "Samples" sheet' },
      { Instructions: '2. Use valid project_id values (validation will occur during upload)' },
      { Instructions: '3. Use exact sample_type values from "Valid Sample Types" sheet' },
      { Instructions: '4. Use exact service_type values from "Valid Service Types" sheet (optional)' },
      { Instructions: '5. well_location is REQUIRED for dna_plate samples' },
      { Instructions: '6. Client sample IDs will be automatically cleaned (special chars → underscores)' },
      { Instructions: '7. Due date will be automatically inherited from the project' },
      { Instructions: '8. Upload as .xlsx or save as .csv to import' },
      { Instructions: '' },
      { Instructions: 'SERVICE TYPE NOTE:' },
      { Instructions: 'If provided, service_type must match the project\'s service type.' },
      { Instructions: 'Leave blank to inherit from project.' },
      { Instructions: '' },
      { Instructions: 'SECURITY NOTE: Project lists are not included in templates.' },
      { Instructions: 'Contact your administrator for valid project IDs.' },
      { Instructions: 'Validation will show available projects if there are errors.' },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData, { header: ['Instructions'] });
    wsInstructions['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    
    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_import_template.xlsx');
  };

  const downloadCSVTemplate = () => {
    const headers = 'project_id,client_sample_id,sample_type,service_type,target_depth,well_location,storage_freezer,storage_shelf,storage_box,storage_position';
    const example1 = `CMBP00001,SAMPLE001,stool,WGS,30,,Freezer1,Shelf1,Box1,A1`;
    const example2 = `CMBP00001,SAMPLE002,dna_plate,V3V4_16S,50,A1,Freezer1,Shelf1,Box1,A2`;
    
    // Add comments explaining valid values (no real project IDs for security)
    const comments = [
      '# SAMPLE IMPORT TEMPLATE',
      '# ',
      '# Valid sample_types: stool, swab, dna, rna, food, milk, dna_plate, other',
      '# Valid service_types: WGS, V1V3_16S, V3V4_16S, ONT_WGS, ONT_V1V8, ANALYSIS_ONLY, INTERNAL, CLINICAL, OTHER',
      '# Project IDs: Contact administrator for valid project IDs (validation will occur during upload)',
      '# Note: service_type is optional but must match project type if provided',
      '# Note: well_location is required for dna_plate samples',
      '# Note: Client sample IDs will be automatically cleaned (special chars → underscores)',
      '# Note: due_date will be inherited from the project',
      '#',
    ].join('\n');
    
    const template = `${comments}\n${headers}\n${example1}\n${example2}`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_import_template.csv';
    a.click();
  };

  // Handle file upload with validation
  const handleFileUpload = async (file: File) => {
    try {
      // Parse the uploaded file
      const samples = await parseUploadedFile(file);
      
      if (samples.length === 0) {
        message.error('No valid samples found in the file');
        return;
      }
      
      // Validate the samples
      const validation = validateSamples(samples);
      
      // Store results for validation modal
      setParsedSamples(samples);
      setValidationResults(validation);
      setIsValidationModalVisible(true);
      
    } catch (error: any) {
      message.error(error.message || 'Failed to process file');
    }
  };

  // Handle confirmed upload after validation
  const handleConfirmedUpload = async () => {
    if (!validationResults || !validationResults.isValid) {
      message.error('Please fix validation errors before uploading');
      return;
    }
    
    setIsUploading(true);
    try {
      // Use cleaned samples for upload
      console.log('Sending data to bulk-import:', {
        samples: validationResults.cleanedSamples
      });
      
      const response = await api.post('/samples/bulk-import', {
        samples: validationResults.cleanedSamples
      });
      
      message.success(`Successfully imported ${response.data.imported} samples`);
      setIsValidationModalVisible(false);
      setParsedSamples([]);
      setValidationResults(null);
      fetchSamples();
      
    } catch (error: any) {
      console.error('Import error:', error.response?.data);
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          message.error(error.response.data.detail);
        } else if (Array.isArray(error.response.data.detail)) {
          message.error(error.response.data.detail[0]?.msg || 'Validation failed');
        } else {
          message.error(JSON.stringify(error.response.data.detail));
        }
      } else {
        message.error('Failed to import samples');
      }
    }
    setIsUploading(false);
  };

  const uploadProps: UploadProps = {
    accept: '.csv,.xlsx',
    beforeUpload: (file) => {
      handleFileUpload(file);
      return false; // Prevent default upload
    },
    showUploadList: false,
  };

  // Filter samples based on search and date range and client-side filters
  const filteredSamples = (samples || []).filter(sample => {
    // Skip null/undefined samples
    if (!sample) return false;
    
    // Search filter
    if (searchText) {
      try {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = 
          (sample.barcode || '').toLowerCase().includes(searchLower) ||
          (sample.client_sample_id || '').toLowerCase().includes(searchLower) ||
          (sample.project_code || '').toLowerCase().includes(searchLower) ||
          (sample.project_name || '').toLowerCase().includes(searchLower) ||
          (sample.client_institution || '').toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      } catch (error) {
        console.error('Error filtering sample:', sample, error);
        return false;
      }
    }
    
    // Status filter (client-side multi-select)
    if (statusFilter.length > 0 && !statusFilter.includes(sample.status)) {
      return false;
    }
    
    // Sample type filter (client-side multi-select)
    if (sampleTypeFilter.length > 0 && !sampleTypeFilter.includes(sample.sample_type)) {
      return false;
    }
    
    // Project filter (client-side multi-select)
    if (projectFilter.length > 0 && !projectFilter.includes(sample.project_id)) {
      return false;
    }
    
    // Date range filter
    if (dateRange[0] && dateRange[1] && sample.created_at) {
      const createdDate = dayjs(sample.created_at);
      if (!createdDate.isValid() || !createdDate.isAfter(dateRange[0]) || !createdDate.isBefore(dateRange[1].endOf('day'))) {
        return false;
      }
    }
    
    return true;
  });

  // Compact columns for reduced scrolling
  const compactColumns: ColumnsType<Sample> = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      fixed: 'left' as const,
      width: 100,
      sorter: (a, b) => (a.barcode || '').localeCompare(b.barcode || ''),
      render: (text: string, record: Sample) => {
        const currentSearch = searchParams.toString();
        const targetPath = `/samples/${record.id}${currentSearch ? '?' + currentSearch : ''}`;
        
        return (
          <Link 
            to={targetPath}
            onClick={(e) => {
              // Open in new tab if cmd/ctrl/shift is pressed
              if (e.metaKey || e.ctrlKey || e.shiftKey) {
                e.preventDefault();
                window.open(targetPath, '_blank');
              }
            }}
          >
            <strong>{text}</strong>
          </Link>
        );
      },
    },
    {
      title: 'Client ID',
      dataIndex: 'client_sample_id',
      key: 'client_sample_id',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => (a.client_sample_id || '').localeCompare(b.client_sample_id || ''),
    },
    {
      title: (
        <Space>
          Project ID
          {projectFilter.length > 0 && (
            <FilterOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          )}
        </Space>
      ),
      dataIndex: 'project_code',
      key: 'project_code',
      width: 100,
      sorter: (a, b) => (a.project_code || '').localeCompare(b.project_code || ''),
      render: (text: string, record: Sample) => (
        <Popover content={
          <div>
            <div><strong>Project:</strong> {record.project_name || 'N/A'}</div>
            <div><strong>Due:</strong> {record.due_date ? dayjs(record.due_date).format('YYYY-MM-DD') : '-'}</div>
          </div>
        }>
          <Link 
            to={`/projects/${record.project_id}`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              // Open in new tab if cmd/ctrl/shift is pressed
              if (e.metaKey || e.ctrlKey || e.shiftKey) {
                e.preventDefault();
                window.open(`/projects/${record.project_id}`, '_blank');
              }
            }}
          >
            {text}
          </Link>
        </Popover>
      ),
    },
    {
      title: 'Institution',
      key: 'institution',
      width: 120,
      ellipsis: true,
      render: (_: any, record: Sample) => (
        <Popover content={record.client_institution}>
          <span style={{ cursor: 'help', fontSize: '12px' }}>
            {abbreviateInstitution(record.client_institution)}
          </span>
        </Popover>
      ),
    },
    {
      title: (
        <Space>
          Type
          {sampleTypeFilter.length > 0 && (
            <FilterOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          )}
        </Space>
      ),
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: 120,
      render: (type: string, record: Sample) => (
        <Popover 
          content={type === 'other' && record.sample_type_other ? record.sample_type_other : null}
          trigger={type === 'other' && record.sample_type_other ? 'hover' : 'none'}
        >
          <Tag style={{ fontSize: '11px', cursor: type === 'other' ? 'help' : 'default' }}>
            {type.toUpperCase()}
            {type === 'other' && record.sample_type_other && ' (*)'}
          </Tag>
        </Popover>
      ),
    },
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      width: 80,
      render: (serviceType: string) => {
        if (!serviceType) return '-';
        const serviceColors: Record<string, string> = {
          'WGS': 'blue',
          'V1V3_16S': 'green',
          'V3V4_16S': 'green',
          'ONT_WGS': 'purple',
          'ONT_V1V8': 'purple',
          'ANALYSIS_ONLY': 'orange',
          'INTERNAL': 'default',
          'CLINICAL': 'red',
          'OTHER': 'default'
        };
        return (
          <Tag color={serviceColors[serviceType] || 'default'} style={{ fontSize: '10px' }}>
            {serviceType.replace(/_/g, '-')}
          </Tag>
        );
      },
    },
    {
      title: (
        <Space>
          Status
          {statusFilter.length > 0 && (
            <FilterOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          )}
        </Space>
      ),
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'} style={{ fontSize: '11px' }}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Lab Data',
      key: 'lab_data',
      width: 200,
      render: (_: any, record: Sample) => {
        const hasExtraction = record.dna_concentration_ng_ul;
        const hasLibrary = record.library_concentration_ng_ul;
        const hasSequencing = record.sequencing_run_id;
        
        return (
          <Space size={4}>
            {hasExtraction && (
              <Popover content={
                <div>
                  <div><strong>Kit:</strong> {record.extraction_kit || '-'}</div>
                  <div><strong>Conc:</strong> {record.dna_concentration_ng_ul?.toFixed(2)} ng/µL</div>
                </div>
              }>
                <Tag color="green" style={{ fontSize: '10px', margin: 0 }}>EXT</Tag>
              </Popover>
            )}
            {hasLibrary && (
              <Popover content={
                <div>
                  <div><strong>Kit:</strong> {record.library_prep_kit || '-'}</div>
                  <div><strong>Conc:</strong> {record.library_concentration_ng_ul?.toFixed(2)} ng/µL</div>
                </div>
              }>
                <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>LIB</Tag>
              </Popover>
            )}
            {hasSequencing && (
              <Popover content={
                <div>
                  <div><strong>Run:</strong> {record.sequencing_run_id}</div>
                  <div><strong>Depth:</strong> {record.achieved_depth}X</div>
                </div>
              }>
                <Tag color="purple" style={{ fontSize: '10px', margin: 0 }}>SEQ</Tag>
              </Popover>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Target Depth',
      dataIndex: 'target_depth',
      key: 'target_depth',
      width: 80,
      sorter: (a, b) => (a.target_depth || 0) - (b.target_depth || 0),
      render: (depth: number | null) => (
        <span style={{ fontSize: '12px' }}>
          {formatDepth(depth)}
        </span>
      ),
    },
    {
      title: 'Yield',
      dataIndex: 'achieved_depth',
      key: 'achieved_depth',
      width: 80,
      sorter: (a, b) => (a.achieved_depth || 0) - (b.achieved_depth || 0),
      render: (depth: number | null) => (
        <span style={{ fontSize: '12px' }}>
          {formatDepth(depth)}
        </span>
      ),
    },
    {
      title: 'Storage',
      key: 'storage',
      width: 120,
      render: (_: any, record: Sample) => {
        if (record.storage_location) {
          const loc = record.storage_location;
          return (
            <Popover content={
              <div>
                <div><strong>Freezer:</strong> {loc.freezer}</div>
                <div><strong>Shelf:</strong> {loc.shelf}</div>
                <div><strong>Box:</strong> {loc.box}</div>
                {loc.position && <div><strong>Position:</strong> {loc.position}</div>}
              </div>
            }>
              <Space size={2}>
                <EnvironmentOutlined />
                <span style={{ fontSize: '12px' }}>{loc.box}</span>
              </Space>
            </Popover>
          );
        }
        return '-';
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 100,
      sorter: (a, b) => {
        const dateA = a.due_date ? dayjs(a.due_date).unix() : 0;
        const dateB = b.due_date ? dayjs(b.due_date).unix() : 0;
        return dateA - dateB;
      },
      render: (date: string) => (
        <span style={{ fontSize: '12px' }}>
          {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right' as const,
      width: 80,
      render: (_: any, record: Sample) => (
        <Space size="small">
          {canPerform('deleteSamples') && (
            <Button 
              type="link" 
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{ padding: '0 4px' }}
              onClick={() => setDeletingSampleId(record.id)}
            >
              Delete
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedSamples,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedSamples(selectedRowKeys as number[]);
    },
  };

  const actionMenuItems = [
    {
      key: 'download-csv',
      icon: <DownloadOutlined />,
      label: 'Download CSV Template',
      onClick: downloadCSVTemplate,
    },
    {
      key: 'download-excel',
      icon: <FileTextOutlined />,
      label: 'Download Excel Template',
      onClick: downloadExcelTemplate,
    },
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: (
        <Upload {...uploadProps}>
          Import from CSV/Excel
        </Upload>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1>Samples</h1>
          <Space>
          {selectedSamples.length > 0 && (
            <Dropdown
              menu={{
                items: [
                  canPerform('updateSampleStatus') && {
                    key: 'status',
                    icon: <CheckCircleOutlined />,
                    label: 'Update Status',
                    onClick: () => setIsBulkStatusModalVisible(true),
                  },
                  canPerform('deleteSamples') && {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: 'Delete Selected',
                    danger: true,
                    onClick: () => setDeletingSampleId(-1),
                  },
                ].filter(Boolean)
              }}
            >
              <Button>
                Bulk Actions ({selectedSamples.length}) <DownloadOutlined />
              </Button>
            </Dropdown>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchSamples()}
          >
            Refresh
          </Button>
          <Dropdown menu={{ items: actionMenuItems }}>
            <Button>
              Actions <DownloadOutlined />
            </Button>
          </Dropdown>
          {canPerform('registerSamples') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsRegisterModalVisible(true)}
            >
              Register Samples
            </Button>
          )}
        </Space>
      </div>

      {/* Filters Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Input
            placeholder="Search by barcode, client ID, project..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              updateURLParams({ search: e.target.value });
            }}
            allowClear
            onClear={() => {
              setSearchText('');
              updateURLParams({ search: '' });
            }}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            placeholder="Status"
            style={{ width: '100%' }}
            mode="multiple"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              updateURLParams({ status: value });
            }}
            maxTagCount={1}
            maxTagTextLength={10}
            popupRender={menu => (
              <>
                <div style={{ padding: '8px', borderBottom: '1px solid #e8e8e8' }}>
                  <Checkbox
                    checked={statusFilter.length === statusOptions.length}
                    indeterminate={statusFilter.length > 0 && statusFilter.length < statusOptions.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allStatuses = statusOptions.map(s => s.value);
                        setStatusFilter(allStatuses);
                        updateURLParams({ status: allStatuses });
                      } else {
                        setStatusFilter([]);
                        updateURLParams({ status: [] });
                      }
                    }}
                  >
                    Select All
                  </Checkbox>
                </div>
                {menu}
              </>
            )}
          >
            {statusOptions.map(status => (
              <Select.Option key={status.value} value={status.value}>
                <Tag color={statusColors[status.value] || 'default'} style={{ marginRight: 0 }}>
                  {status.label}
                </Tag>
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            placeholder="Sample Type"
            style={{ width: '100%' }}
            mode="multiple"
            value={sampleTypeFilter}
            onChange={(value) => {
              setSampleTypeFilter(value);
              updateURLParams({ type: value });
            }}
            maxTagCount={1}
            maxTagTextLength={10}
            popupRender={menu => (
              <>
                <div style={{ padding: '8px', borderBottom: '1px solid #e8e8e8' }}>
                  <Checkbox
                    checked={sampleTypeFilter.length === sampleTypes.length}
                    indeterminate={sampleTypeFilter.length > 0 && sampleTypeFilter.length < sampleTypes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allTypes = sampleTypes.map(t => t.name);
                        setSampleTypeFilter(allTypes);
                        updateURLParams({ type: allTypes });
                      } else {
                        setSampleTypeFilter([]);
                        updateURLParams({ type: [] });
                      }
                    }}
                  >
                    Select All
                  </Checkbox>
                </div>
                {menu}
              </>
            )}
          >
            {sampleTypes.map(type => (
              <Select.Option key={type.name} value={type.name}>
                {type.label}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            placeholder="Project"
            style={{ width: '100%' }}
            mode="multiple"
            value={projectFilter}
            onChange={(value) => {
              setProjectFilter(value);
              updateURLParams({ project: value });
            }}
            maxTagCount={1}
            maxTagTextLength={10}
            optionFilterProp="children"
            popupRender={menu => (
              <>
                <div style={{ padding: '8px', borderBottom: '1px solid #e8e8e8' }}>
                  <Checkbox
                    checked={projectFilter.length === projects.length}
                    indeterminate={projectFilter.length > 0 && projectFilter.length < projects.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allProjects = projects.map(p => p.id);
                        setProjectFilter(allProjects);
                        updateURLParams({ project: allProjects });
                      } else {
                        setProjectFilter([]);
                        updateURLParams({ project: [] });
                      }
                    }}
                  >
                    Select All
                  </Checkbox>
                </div>
                {menu}
              </>
            )}
          >
            {projects.map(project => (
              <Select.Option key={project.id} value={project.id}>
                {project.project_id} - {project.name}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <RangePicker
            style={{ width: '100%' }}
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates as [Dayjs | null, Dayjs | null]);
              if (dates && dates[0] && dates[1]) {
                updateURLParams({ 
                  start: dates[0].format('YYYY-MM-DD'), 
                  end: dates[1].format('YYYY-MM-DD') 
                });
              } else {
                updateURLParams({ start: null, end: null });
              }
            }}
            placeholder={['Start Date', 'End Date']}
          />
        </Col>
      </Row>

      {/* Show Deleted Toggle */}
      {canPerform('deleteSamples') && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Switch
              checked={showDeleted}
              onChange={(checked) => {
                setShowDeleted(checked);
                updateURLParams({ deleted: checked });
              }}
            />
            <span>Show deleted samples</span>
          </Space>
        </div>
      )}
      </div>

      <Table
        columns={compactColumns}
        dataSource={filteredSamples}
        loading={loading}
        rowKey="id"
        size="small"
        scroll={{ x: 1400 }}
        rowSelection={rowSelection}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          showTotal: (total) => `Total ${total} samples`,
          onChange: (page, size) => {
            setCurrentPage(page);
            if (size !== pageSize) {
              setPageSize(size);
              setCurrentPage(1); // Reset to first page when page size changes
            }
            updateURLParams({ page, pageSize: size });
          },
          onShowSizeChange: (current, size) => {
            setPageSize(size);
            setCurrentPage(1);
            updateURLParams({ page: 1, pageSize: size });
          }
        }}
      />

      {/* Register Modal */}
      <Modal
        title="Register Samples"
        open={isRegisterModalVisible}
        onCancel={() => {
          setIsRegisterModalVisible(false);
          form.resetFields();
          setBulkSamples([]);
        }}
        footer={null}
        width={900}
      >
        <Tabs
          activeKey={isBulkRegister ? 'bulk' : 'single'}
          onChange={(key) => setIsBulkRegister(key === 'bulk')}
          items={[
            {
              key: 'single',
              label: 'Single Sample',
              children: (
                <Form
              form={form}
              layout="vertical"
              onFinish={handleRegisterSubmit}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="project_id"
                    label="Project"
                    rules={[{ required: true, message: 'Please select project' }]}
                  >
                    <Select
                      placeholder="Select project"
                      showSearch
                      optionFilterProp="children"
                    >
                      {projects.map(project => (
                        <Select.Option key={project.id} value={project.id}>
                          {project.project_id} - {project.client.institution}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sample_type"
                    label="Sample Type"
                    rules={[{ required: true, message: 'Please select type' }]}
                  >
                    <Select placeholder="Select sample type">
                      {sampleTypes.map(type => (
                        <Select.Option key={type.value} value={type.value}>
                          {type.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="client_sample_id"
                    label="Client Sample ID"
                  >
                    <Input placeholder="Enter client's sample ID" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="target_depth"
                    label="Target Depth (M reads)"
                    tooltip="1GB = 6.6M reads"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="e.g., 30"
                      min={1}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.sample_type !== currentValues.sample_type
                }
              >
                {({ getFieldValue }) => {
                  const sampleTypeId = getFieldValue('sample_type');
                  const selectedType = sampleTypes.find(st => st.value === sampleTypeId);
                  return (
                    <>
                      {selectedType?.name === 'dna_plate' && (
                        <Form.Item
                          name="well_location"
                          label="Well Location"
                          rules={[{ required: true, message: 'Well location required for DNA plates' }]}
                        >
                          <Input placeholder="e.g., A1, B2" />
                        </Form.Item>
                      )}
                      {selectedType?.requires_description && (
                        <Form.Item
                          name="sample_type_other"
                          label="Sample Type Description"
                          rules={[{ required: true, message: 'Please describe the sample type' }]}
                        >
                          <Input placeholder="Please specify the sample type" />
                        </Form.Item>
                      )}
                    </>
                  );
                }}
              </Form.Item>

              <Form.Item
                name="storage_location_id"
                label="Storage Location"
              >
                <Select
                  placeholder="Select storage location"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  notFoundContent={
                    <div style={{ textAlign: 'center', padding: 8 }}>
                      <Text type="secondary">No locations found</Text>
                      <br />
                      <a href="/storage" target="_blank" rel="noopener noreferrer">
                        Manage Storage Locations
                      </a>
                    </div>
                  }
                >
                  {storageLocations.map(loc => (
                    <Select.Option key={loc.id} value={loc.id}>
                      {loc.freezer} / {loc.shelf} / {loc.box}
                      {loc.position && ` / ${loc.position}`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Register Sample
                </Button>
              </Form.Item>
            </Form>
              ),
            },
            {
              key: 'bulk',
              label: 'Bulk Register',
              children: (
                <Form
              form={form}
              layout="vertical"
              onFinish={handleRegisterSubmit}
            >
              <Alert
                message="Bulk Registration"
                description="Barcodes will be automatically generated for all samples. Maximum 2000 samples per batch."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="project_id"
                    label="Project"
                    rules={[{ required: true, message: 'Please select project' }]}
                  >
                    <Select
                      placeholder="Select project"
                      showSearch
                      optionFilterProp="children"
                    >
                      {projects.map(project => (
                        <Select.Option key={project.id} value={project.id}>
                          {project.project_id} - {project.client.institution}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="sample_type"
                    label="Sample Type"
                    rules={[{ required: true, message: 'Please select type' }]}
                  >
                    <Select placeholder="Select sample type">
                      {sampleTypes.map(type => (
                        <Select.Option key={type.value} value={type.value}>
                          {type.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Number of Samples (Max: 2000)">
                    <InputNumber
                      value={bulkCount}
                      onChange={(value) => handleBulkCountChange(value || 1)}
                      min={1}
                      max={2000}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {bulkCount <= 10 ? (
                <>
                  <Divider>Sample Details</Divider>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {bulkSamples.slice(0, 10).map((sample, index) => (
                      <Card key={index} size="small" style={{ marginBottom: 8 }}>
                        <Row gutter={16}>
                          <Col span={6}>
                            <strong>Sample {index + 1}</strong>
                          </Col>
                          <Col span={6}>
                            <Input
                              placeholder="Client Sample ID"
                              value={sample.client_sample_id}
                              onChange={(e) => {
                                const newSamples = [...bulkSamples];
                                newSamples[index].client_sample_id = e.target.value;
                                setBulkSamples(newSamples);
                              }}
                            />
                          </Col>
                          <Col span={4}>
                            <InputNumber
                              placeholder="Target Depth"
                              value={sample.target_depth}
                              onChange={(value) => {
                                const newSamples = [...bulkSamples];
                                newSamples[index].target_depth = value;
                                setBulkSamples(newSamples);
                              }}
                              style={{ width: '100%' }}
                            />
                          </Col>
                          {form.getFieldValue('sample_type') === 'dna_plate' && (
                            <Col span={4}>
                              <Input
                                placeholder="Well Location"
                                value={sample.well_location}
                                onChange={(e) => {
                                  const newSamples = [...bulkSamples];
                                  newSamples[index].well_location = e.target.value;
                                  setBulkSamples(newSamples);
                                }}
                              />
                            </Col>
                          )}
                          <Col span={4}>
                            <Select
                              placeholder="Storage"
                              value={sample.storage_location_id}
                              onChange={(value) => {
                                const newSamples = [...bulkSamples];
                                newSamples[index].storage_location_id = value;
                                setBulkSamples(newSamples);
                              }}
                              style={{ width: '100%' }}
                            >
                              {storageLocations.map(loc => (
                                <Select.Option key={loc.id} value={loc.id}>
                                  {loc.box}
                                </Select.Option>
                              ))}
                            </Select>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Alert
                  message="Bulk Entry Mode"
                  description={`For ${bulkCount} samples, consider using CSV import for easier data entry. Download the template from the Actions menu.`}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" onClick={downloadCSVTemplate}>
                      Download Template
                    </Button>
                  }
                />
              )}

              <Form.Item style={{ marginTop: 16 }}>
                <Button type="primary" htmlType="submit" block>
                  Register {bulkCount} Samples
                </Button>
              </Form.Item>
            </Form>
              ),
            },
          ]}
        />
      </Modal>

      {/* Bulk Status Update Modal */}
      <Modal
        title={`Update Status for ${selectedSamples.length} Samples`}
        open={isBulkStatusModalVisible}
        onCancel={() => {
          setIsBulkStatusModalVisible(false);
          statusForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Bulk Status Update"
          description="All selected samples will be updated to the chosen status. This action cannot be undone."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={handleBulkStatusUpdate}
        >
          <Form.Item
            name="status"
            label="New Status"
            rules={[{ required: true, message: 'Please select a status' }]}
          >
            <Select
              placeholder="Select new status for all selected samples"
              showSearch
              optionFilterProp="children"
            >
              {statusOptions.map(status => (
                <Select.Option key={status.value} value={status.value}>
                  <Tag color={statusColors[status.value] || 'default'}>
                    {status.label}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes (Optional)"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Add any notes about this status change..."
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsBulkStatusModalVisible(false);
                statusForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Status
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Sample Modal */}
      <Modal
        title={deletingSampleId === -1 ? `Delete ${selectedSamples.length} Samples` : "Delete Sample"}
        open={deletingSampleId !== null}
        onCancel={() => {
          setDeletingSampleId(null);
          deleteForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Alert
          message="Confirm Deletion"
          description={
            deletingSampleId === -1 
              ? `This action will mark ${selectedSamples.length} samples as deleted. The samples will be removed from active lists but remain in the system for audit purposes.`
              : "This action will mark the sample as deleted. The sample will be removed from active lists but remain in the system for audit purposes."
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={deleteForm}
          layout="vertical"
          onFinish={(values) => {
            if (deletingSampleId) {
              handleDeleteSample(deletingSampleId, values.reason);
            }
          }}
        >
          <Form.Item
            name="reason"
            label="Deletion Reason"
            rules={[
              { required: true, message: 'Please provide a reason for deletion' },
              { min: 10, message: 'Reason must be at least 10 characters' }
            ]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Please provide a detailed reason for deleting this sample..."
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setDeletingSampleId(null);
                deleteForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" danger htmlType="submit">
                {deletingSampleId === -1 ? `Delete ${selectedSamples.length} Samples` : 'Delete Sample'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Validation Modal */}
      <Modal
        title="Import Validation Results"
        open={isValidationModalVisible}
        onCancel={() => {
          setIsValidationModalVisible(false);
          setParsedSamples([]);
          setValidationResults(null);
        }}
        footer={null}
        width={800}
      >
        {validationResults && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color="blue">Total Samples: {validationResults.totalSamples}</Tag>
                {validationResults.isValid ? (
                  <Tag color="green">✓ Ready to Import</Tag>
                ) : (
                  <Tag color="red">✗ Has Errors</Tag>
                )}
                {validationResults.warnings.length > 0 && (
                  <Tag color="orange">⚠ {validationResults.warnings.length} Warnings</Tag>
                )}
              </Space>
            </div>

            {validationResults.errors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: '#ff4d4f' }}>Errors (must fix before import):</h4>
                <ul style={{ color: '#ff4d4f', marginBottom: 16 }}>
                  {validationResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResults.warnings.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: '#fa8c16' }}>Warnings (will be applied during import):</h4>
                <ul style={{ color: '#fa8c16', marginBottom: 16 }}>
                  {validationResults.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResults.isValid && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: '#52c41a' }}>Ready to Import</h4>
                <p>All validation checks passed. Click "Import Samples" to proceed.</p>
                {validationResults.warnings.length > 0 && (
                  <p><strong>Note:</strong> Sample names will be automatically cleaned as shown in warnings above.</p>
                )}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setIsValidationModalVisible(false);
                  setParsedSamples([]);
                  setValidationResults(null);
                }}>
                  Cancel
                </Button>
                {validationResults.isValid && (
                  <Button 
                    type="primary" 
                    loading={isUploading}
                    onClick={handleConfirmedUpload}
                  >
                    Import {validationResults.totalSamples} Samples
                  </Button>
                )}
              </Space>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Samples;