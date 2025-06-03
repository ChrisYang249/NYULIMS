import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Space,
  message,
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  InputNumber,
  Divider,
  Badge,
  Statistic,
  List,
  Checkbox,
  Tag,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  WarningOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { api } from '../../config/api';
import PlateGrid from './PlateGrid';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface PlateWell {
  position: string;
  row: string;
  column: number;
  content_type: 'sample' | 'control' | 'empty';
  sample_id?: number;
  sample_barcode?: string;
  sample_type?: string;
  client_sample_id?: string;
  project_code?: string;
  control_id?: string;
  control_type?: string;
  control_category?: string;
}

interface PlateLayout {
  plate_id: string;
  plate_name?: string;
  status: string;
  wells: PlateWell[];
  sample_count: number;
  control_count: number;
  empty_count: number;
}

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  sample_type: string;
  project_code: string;
  client_institution: string;
  due_date?: string;
}

interface PlateEditorProps {
  plateId: number;
  onClose?: () => void;
}

const PlateEditor: React.FC<PlateEditorProps> = ({ plateId, onClose }) => {
  const [layout, setLayout] = useState<PlateLayout | null>(null);
  const [availableSamples, setAvailableSamples] = useState<Sample[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [selectedWells, setSelectedWells] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [labTechs, setLabTechs] = useState<any[]>([]);
  
  // Modals
  const [isAddControlModalVisible, setIsAddControlModalVisible] = useState(false);
  const [isFinalizeModalVisible, setIsFinalizeModalVisible] = useState(false);
  
  const [controlForm] = Form.useForm();
  const [finalizeForm] = Form.useForm();

  useEffect(() => {
    fetchPlateLayout();
    fetchAvailableSamples();
    fetchLabTechs();
  }, [plateId]);

  const fetchPlateLayout = async () => {
    try {
      const response = await api.get(`/plate-editor/${plateId}/layout`);
      setLayout(response.data);
    } catch (error) {
      message.error('Failed to fetch plate layout');
    }
  };

  const fetchAvailableSamples = async () => {
    try {
      const response = await api.get('/samples/queues/extraction', {
        params: { limit: 1000 }
      });
      // Filter out samples already on any plate
      const available = response.data.filter((sample: Sample) => 
        !layout?.wells.some(well => well.sample_id === sample.id)
      );
      setAvailableSamples(available);
    } catch (error) {
      message.error('Failed to fetch available samples');
    }
  };

  const fetchLabTechs = async () => {
    try {
      const response = await api.get('/users');
      const techs = response.data.filter((user: any) => 
        ['lab_tech', 'lab_manager'].includes(user.role)
      );
      setLabTechs(techs);
    } catch (error) {
      message.error('Failed to fetch lab technicians');
    }
  };

  const handleWellClick = (well: PlateWell) => {
    if (layout?.status !== 'draft') {
      return; // Not editable
    }

    const isSelected = selectedWells.includes(well.position);
    if (isSelected) {
      setSelectedWells(prev => prev.filter(pos => pos !== well.position));
    } else {
      setSelectedWells(prev => [...prev, well.position]);
    }
  };

  const handleAddSamplesToPlate = async () => {
    if (selectedSamples.length === 0 || selectedWells.length === 0) {
      message.warning('Please select both samples and well positions');
      return;
    }

    if (selectedSamples.length !== selectedWells.length) {
      message.warning('Number of samples must match number of selected wells');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/plate-editor/${plateId}/samples/add`, {
        sample_ids: selectedSamples,
        positions: selectedWells
      });
      
      message.success(`Added ${selectedSamples.length} samples to plate`);
      setSelectedSamples([]);
      setSelectedWells([]);
      fetchPlateLayout();
      fetchAvailableSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to add samples');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSample = async (sampleId: number) => {
    setLoading(true);
    try {
      await api.delete(`/plate-editor/${plateId}/samples/${sampleId}`);
      message.success('Sample removed from plate');
      fetchPlateLayout();
      fetchAvailableSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to remove sample');
    } finally {
      setLoading(false);
    }
  };

  const handleAddControlSet = async (values: any) => {
    if (selectedWells.length < 2) {
      message.warning('Please select at least 2 wells for controls (positive and negative)');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/plate-editor/${plateId}/controls/add`, {
        control_category: values.control_category,
        positions: selectedWells.slice(0, 2), // Take first 2 positions
        lot_number: values.lot_number,
        expiration_date: values.expiration_date?.format('YYYY-MM-DD'),
        supplier: values.supplier,
        product_name: values.product_name,
        input_volume: values.input_volume || 250,
        elution_volume: values.elution_volume || 100,
        notes: values.notes
      });
      
      message.success('Control set added to plate');
      setSelectedWells([]);
      setIsAddControlModalVisible(false);
      controlForm.resetFields();
      fetchPlateLayout();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to add controls');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveControl = async (controlId: string) => {
    setLoading(true);
    try {
      await api.delete(`/plate-editor/${plateId}/controls/${controlId}`);
      message.success('Control removed from plate');
      fetchPlateLayout();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to remove control');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizePlate = async (values: any) => {
    setLoading(true);
    try {
      await api.put(`/plate-editor/${plateId}/finalize`, {
        assigned_tech_id: values.assigned_tech_id
      });
      
      message.success('Plate finalized and assigned to technician');
      setIsFinalizeModalVisible(false);
      finalizeForm.resetFields();
      fetchPlateLayout();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to finalize plate');
    } finally {
      setLoading(false);
    }
  };

  if (!layout) {
    return <div>Loading...</div>;
  }

  const isDraft = layout.status === 'draft';
  const samplesOnPlate = layout.wells.filter(w => w.content_type === 'sample');
  const controlsOnPlate = layout.wells.filter(w => w.content_type === 'control');

  return (
    <div>
      <Row gutter={16}>
        {/* Plate Grid */}
        <Col span={12}>
          <PlateGrid
            wells={layout.wells}
            onWellClick={handleWellClick}
            selectedWells={selectedWells}
            editable={isDraft}
            plateStatus={layout.status}
          />
          
          {/* Plate Actions */}
          {isDraft && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddSamplesToPlate}
                  disabled={selectedSamples.length === 0 || selectedWells.length === 0}
                  loading={loading}
                >
                  Add Selected Samples
                </Button>
                <Button
                  icon={<ExperimentOutlined />}
                  onClick={() => setIsAddControlModalVisible(true)}
                  disabled={selectedWells.length < 2}
                >
                  Add Control Set
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => setIsFinalizeModalVisible(true)}
                  disabled={layout.sample_count === 0 || layout.control_count === 0}
                  danger
                >
                  Finalize Plate
                </Button>
              </Space>
            </Card>
          )}
        </Col>

        {/* Control Panel */}
        <Col span={12}>
          {/* Plate Stats */}
          <Card size="small" title="Plate Statistics">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Samples"
                  value={layout.sample_count}
                  prefix={<ExperimentOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Controls"
                  value={layout.control_count}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Empty"
                  value={layout.empty_count}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Available Samples */}
          {isDraft && (
            <Card 
              size="small" 
              title={
                <div>
                  <span>Available Samples</span>
                  <Badge count={selectedSamples.length} style={{ marginLeft: 8 }} />
                  {selectedWells.length > 0 && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {selectedWells.length} wells selected
                    </Tag>
                  )}
                </div>
              }
              style={{ marginTop: 16 }}
            >
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <Checkbox.Group
                  value={selectedSamples}
                  onChange={setSelectedSamples}
                  style={{ width: '100%' }}
                >
                  <List
                    size="small"
                    dataSource={availableSamples.slice(0, 50)} // Limit for performance
                    renderItem={(sample) => (
                      <List.Item>
                        <Checkbox value={sample.id}>
                          <div>
                            <strong>{sample.barcode}</strong> - {sample.sample_type}
                            <br />
                            <small>{sample.project_code} | {sample.client_institution}</small>
                          </div>
                        </Checkbox>
                      </List.Item>
                    )}
                  />
                </Checkbox.Group>
              </div>
            </Card>
          )}

          {/* Samples on Plate */}
          <Card
            size="small"
            title="Samples on Plate"
            style={{ marginTop: 16 }}
          >
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={samplesOnPlate}
                renderItem={(well) => (
                  <List.Item
                    actions={isDraft ? [
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveSample(well.sample_id!)}
                      />
                    ] : []}
                  >
                    <div>
                      <strong>{well.position}</strong>: {well.sample_barcode}
                      <br />
                      <small>{well.project_code} | {well.sample_type}</small>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </Card>

          {/* Controls on Plate */}
          <Card
            size="small"
            title="Controls on Plate"
            style={{ marginTop: 16 }}
          >
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={controlsOnPlate}
                renderItem={(well) => (
                  <List.Item
                    actions={isDraft ? [
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveControl(well.control_id!)}
                      />
                    ] : []}
                  >
                    <div>
                      <strong>{well.position}</strong>: {well.control_id}
                      <br />
                      <Tag color={well.control_type === 'positive' ? 'green' : 'red'}>
                        {well.control_type} {well.control_category}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Add Control Set Modal */}
      <Modal
        title="Add Control Set"
        open={isAddControlModalVisible}
        onCancel={() => {
          setIsAddControlModalVisible(false);
          controlForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message={`Selected wells: ${selectedWells.join(', ')}`}
          description="First 2 wells will be used for positive and negative controls"
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={controlForm}
          layout="vertical"
          onFinish={handleAddControlSet}
        >
          <Form.Item
            name="control_category"
            label="Control Category"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select category">
              <Option value="extraction">Extraction Controls</Option>
              <Option value="library_prep">Library Prep Controls</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lot_number" label="Lot Number">
                <Input placeholder="e.g., LOT123456" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiration_date" label="Expiration Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier" label="Supplier">
                <Input placeholder="e.g., Qiagen" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="product_name" label="Product Name">
                <Input placeholder="e.g., PowerSoil Pro" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="input_volume" label="Input Volume (µL)" initialValue={250}>
                <InputNumber min={1} max={500} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="elution_volume" label="Elution Volume (µL)" initialValue={100}>
                <InputNumber min={25} max={200} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Any special instructions..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Add Control Set
              </Button>
              <Button onClick={() => setIsAddControlModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Finalize Plate Modal */}
      <Modal
        title="Finalize Plate"
        open={isFinalizeModalVisible}
        onCancel={() => {
          setIsFinalizeModalVisible(false);
          finalizeForm.resetFields();
        }}
        footer={null}
      >
        <Alert
          message="Warning: Once finalized, this plate cannot be edited"
          description="The plate will be locked and assigned to a technician for extraction"
          type="warning"
          style={{ marginBottom: 16 }}
        />

        <Form
          form={finalizeForm}
          layout="vertical"
          onFinish={handleFinalizePlate}
        >
          <Form.Item
            name="assigned_tech_id"
            label="Assign to Lab Technician"
            rules={[{ required: true, message: 'Please select a technician' }]}
          >
            <Select placeholder="Select technician">
              {labTechs.map((tech) => (
                <Option key={tech.id} value={tech.id}>
                  <Space>
                    <TeamOutlined />
                    {tech.full_name} - {tech.role.replace('_', ' ').toUpperCase()}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} danger>
                Finalize Plate
              </Button>
              <Button onClick={() => setIsFinalizeModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlateEditor;