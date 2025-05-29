import QueueTable from '../../components/samples/QueueTable';

const Accessioning = () => {
  return (
    <QueueTable
      queueName="accessioning"
      title="Accessioning Queue"
      nextStatus="accessioned"
      nextStatusLabel="Accession"
      allowBatch={true}
      showPriority={true}
      showFailure={false}  // Can't fail at accessioning stage
    />
  );
};

export default Accessioning;