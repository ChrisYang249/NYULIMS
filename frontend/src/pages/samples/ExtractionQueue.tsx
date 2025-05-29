import QueueTable from '../../components/samples/QueueTable';
import { Button } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

const ExtractionQueue = () => {
  const extraActions = (record: any) => (
    <Button
      size="small"
      icon={<ExperimentOutlined />}
      onClick={() => {
        // TODO: Implement batch assignment to extraction plates
        console.log('Assign to plate:', record);
      }}
    >
      Assign to Plate
    </Button>
  );

  return (
    <QueueTable
      queueName="extraction"
      title="Extraction Queue"
      nextStatus="in_extraction"
      nextStatusLabel="Start Extraction"
      allowBatch={true}
      showPriority={true}
      showFailure={false}
      extraActions={extraActions}
    />
  );
};

export default ExtractionQueue;