import QueueTable from '../../components/samples/QueueTable';
import { Tag, Tooltip } from 'antd';

const ReprocessQueue = () => {
  const extraColumns = [
    {
      title: 'Failed Stage',
      dataIndex: 'failed_stage',
      key: 'failed_stage',
      width: 120,
      render: (stage: string) => {
        const stageColors: Record<string, string> = {
          extraction: 'red',
          library_prep: 'orange',
          sequencing: 'purple',
        };
        return stage ? (
          <Tag color={stageColors[stage] || 'default'}>
            {stage.replace('_', ' ').toUpperCase()}
          </Tag>
        ) : '-';
      },
    },
    {
      title: 'Failure Reason',
      dataIndex: 'failure_reason',
      key: 'failure_reason',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <QueueTable
      queueName="reprocess"
      title="Reprocess Queue"
      nextStatus=""  // No automatic next status
      nextStatusLabel=""
      allowBatch={false}  // Handle individually
      showPriority={true}
      showFailure={false}  // Already failed
      extraColumns={extraColumns}
    />
  );
};

export default ReprocessQueue;