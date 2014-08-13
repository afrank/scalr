<?php

namespace Scalr\Modules\Platforms\Rackspace\Adapters;

class StatusAdapter implements \Scalr\Modules\Platforms\StatusAdapterInterface
{
    private $platformStatus;

    //BUILD, REBUILD, SUSPENDED, QUEUE_RESIZE, PREP_RESIZE, RESIZE, VERIFY_RESIZE, PASSWORD, RESCUE, REBOOT,
    //QUEUE_MOVE, PREP_MOVE, MOVE, VERIFY_MOVE
    //HARD_REBOOT, SHARE_IP, SHARE_IP_NO_CONFIG, DELETE_IP, UNKNOWN

    private $runningStatuses = array(
        'ACTIVE', 'REBUILD','SUSPENDED','QUEUE_RESIZE', 'PREP_RESIZE', 'RESIZE', 'VERIFY_RESIZE', 'PASSWORD', 'RESCUE', 'REBOOT',
        'HARD_REBOOT', 'SHARE_IP', 'SHARE_IP_NO_CONFIG', 'DELETE_IP', 'QUEUE_MOVE', 'PREP_MOVE', 'MOVE', 'VERIFY_MOVE'
    );

    public static function load($status)
    {
        $class = get_called_class();
        return new $class($status);
    }

    public function __construct($status)
    {
        $this->platformStatus = $status;
    }

    public function getName()
    {
        return $this->platformStatus;
    }

    public function isRunning()
    {
        return (in_array($this->platformStatus, $this->runningStatuses) !== false);
    }

    public function isPending()
    {
        return $this->platformStatus == 'BUILD' ? true : false;
    }

    public function isTerminated()
    {
        return (in_array($this->platformStatus, array('DELETED', 'not-found', 'UNKNOWN', 'ERROR')) !== false);
    }

    public function isSuspended()
    {
        return ($this->platformStatus == 'SUSPENDED');
    }

    public function isPendingSuspend()
    {
        //
    }

    public function isPendingRestore()
    {
        //
    }
}