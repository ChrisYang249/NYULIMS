import React from 'react';
import { Card, Tooltip } from 'antd';
import { ExperimentOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';

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

interface PlateGridProps {
  wells: PlateWell[];
  onWellClick?: (well: PlateWell) => void;
  selectedWells?: string[];
  editable?: boolean;
  plateStatus?: string;
}

const PlateGrid: React.FC<PlateGridProps> = ({
  wells,
  onWellClick,
  selectedWells = [],
  editable = false,
  plateStatus = 'draft'
}) => {
  const getWellStyle = (well: PlateWell) => {
    const baseStyle: React.CSSProperties = {
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: 'bold',
      border: '2px solid #d9d9d9',
      borderRadius: '4px',
      cursor: editable ? 'pointer' : 'default',
      margin: '1px',
      position: 'relative',
      textAlign: 'center',
      lineHeight: '1',
    };

    const isSelected = selectedWells.includes(well.position);

    switch (well.content_type) {
      case 'sample':
        return {
          ...baseStyle,
          backgroundColor: isSelected ? '#1890ff' : '#e6f7ff',
          borderColor: isSelected ? '#0050b3' : '#1890ff',
          color: isSelected ? 'white' : '#1890ff',
        };
      case 'control':
        const isPositive = well.control_type === 'positive';
        const isExtraction = well.control_category === 'extraction';
        return {
          ...baseStyle,
          backgroundColor: isSelected 
            ? (isPositive ? '#52c41a' : '#ff4d4f')
            : (isPositive ? '#f6ffed' : '#fff2f0'),
          borderColor: isSelected
            ? (isPositive ? '#237804' : '#a8071a')
            : (isPositive ? '#52c41a' : '#ff4d4f'),
          color: isSelected 
            ? 'white' 
            : (isPositive ? '#52c41a' : '#ff4d4f'),
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: isSelected ? '#f0f0f0' : '#fafafa',
          borderColor: isSelected ? '#8c8c8c' : '#d9d9d9',
          color: isSelected ? '#262626' : '#8c8c8c',
        };
    }
  };

  const getWellContent = (well: PlateWell) => {
    switch (well.content_type) {
      case 'sample':
        return well.sample_barcode?.slice(-4) || 'S';
      case 'control':
        const typeCode = well.control_type === 'positive' ? '+' : '-';
        const catCode = well.control_category === 'extraction' ? 'E' : 'L';
        return `${catCode}${typeCode}`;
      default:
        return '';
    }
  };

  const getTooltipContent = (well: PlateWell) => {
    switch (well.content_type) {
      case 'sample':
        return (
          <div>
            <div><strong>Sample:</strong> {well.sample_barcode}</div>
            <div><strong>Client ID:</strong> {well.client_sample_id}</div>
            <div><strong>Type:</strong> {well.sample_type}</div>
            <div><strong>Project:</strong> {well.project_code}</div>
          </div>
        );
      case 'control':
        return (
          <div>
            <div><strong>Control:</strong> {well.control_id}</div>
            <div><strong>Type:</strong> {well.control_type}</div>
            <div><strong>Category:</strong> {well.control_category}</div>
          </div>
        );
      default:
        return `Empty well ${well.position}`;
    }
  };

  const renderGrid = () => {
    const rows = [];
    
    // Header row with column numbers
    const headerRow = (
      <div key="header" style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '32px', height: '32px', margin: '1px' }}></div>
        {Array.from({ length: 12 }, (_, i) => (
          <div 
            key={i + 1}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              margin: '1px',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
    );
    rows.push(headerRow);

    // Data rows
    for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
      const rowLabel = String.fromCharCode(65 + rowIdx); // A, B, C...
      
      const row = (
        <div key={rowLabel} style={{ display: 'flex', alignItems: 'center' }}>
          {/* Row label */}
          <div
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              margin: '1px',
            }}
          >
            {rowLabel}
          </div>
          
          {/* Wells */}
          {Array.from({ length: 12 }, (_, colIdx) => {
            const position = `${rowLabel}${colIdx + 1}`;
            const well = wells.find(w => w.position === position) || {
              position,
              row: rowLabel,
              column: colIdx + 1,
              content_type: 'empty' as const,
            };

            return (
              <Tooltip key={position} title={getTooltipContent(well)}>
                <div
                  style={getWellStyle(well)}
                  onClick={() => onWellClick?.(well)}
                >
                  {getWellContent(well)}
                </div>
              </Tooltip>
            );
          })}
        </div>
      );
      rows.push(row);
    }

    return rows;
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>96-Well Plate Layout</span>
          {plateStatus === 'draft' && (
            <span style={{ color: '#faad14', fontSize: '12px' }}>
              <WarningOutlined /> Draft - Editable
            </span>
          )}
          {plateStatus === 'finalized' && (
            <span style={{ color: '#52c41a', fontSize: '12px' }}>
              <CheckCircleOutlined /> Finalized
            </span>
          )}
        </div>
      }
      size="small"
      style={{ 
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {renderGrid()}
      </div>
      
      {/* Legend */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#e6f7ff',
            border: '1px solid #1890ff',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '12px' }}>Sample</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#f6ffed',
            border: '1px solid #52c41a',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '12px' }}>Positive Control</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#fff2f0',
            border: '1px solid #ff4d4f',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '12px' }}>Negative Control</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: '2px',
          }} />
          <span style={{ fontSize: '12px' }}>Empty</span>
        </div>
      </div>
    </Card>
  );
};

export default PlateGrid;