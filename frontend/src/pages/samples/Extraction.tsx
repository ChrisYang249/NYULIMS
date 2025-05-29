import QueueTable from '../../components/samples/QueueTable';

const Extraction = () => {
  const extraColumns = [
    {
      title: 'Plate',
      key: 'plate',
      width: 100,
      render: (_: any, record: any) => record.batch_id || '-',
    },
    {
      title: 'Well',
      key: 'well',
      width: 80,
      render: (_: any, record: any) => record.well_location || '-',
    },
  ];

  return (
    <QueueTable
      queueName="extraction_active"
      title="Samples in Extraction"
      nextStatus="extracted"
      nextStatusLabel="Complete Extraction"
      allowBatch={true}
      showPriority={false}  // Already in process
      showFailure={true}
      extraColumns={extraColumns}
    />
  );
};

export default Extraction;