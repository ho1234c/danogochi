import React, { Component, createContext } from "react";
import items from "./ItemRepository";
import * as Constants from "./Constants";
import { Pedometer } from "expo-sensors";

const Context = createContext();
const { Provider, Consumer } = Context;

class StateProvider extends Component {
  constructor(props) {
    super(props);
    
    this.growthStages = [0, Constants.THRESHOLD_BETTER, Constants.THRESHOLD_BEST];
    this.state = {
      // 0: good, 1: better, 2: best
      growthStage: 0,
      hatchingLevel: 0,

      /**
       * 0 ~ THRESHOLD_BETTER : good
       * THRESHOLD_BETTER ~ THRESHOLD_BEST : better
       * THRESHOLD_BEST ~ MAX_LOVE_POINT : best
       */
      lovePoint: 0,

      isAppForeground: true,
      isWalking: false,
      isFinding: false,

      previousStep: 0,
      isPedometerAvailable: "checking",

      /**
       * desiredItemId는 항상 하나를 갖고 있는다. 
       * isDesiringItem이 false일 때는 드러나지 않다가 true가 될 때 캐릭터가 요청한다. 
       * distanceToItem이 이 FIND_ITEM_DISTANCE되면 아이템을 만난다.
       */
      isDesiringItem: false,
      desiredItemId: null,
      distanceToItem: 100,
      // 시연을 위해 100을 상수로 넣겠다.
      lovePointToIncrease: 100,
 
      isThirsty: false,
      isDrinking: false,

      isEvolving: false,

      isHappy: false,

      message: "",
      // TODO : 말풍선
    };

    this.actions = {
      hatch: this.hatch,
      drink: this.drink,
      desireItem: this.desireItem,
      pickUpItem: this.pickUpItem,
      becomeThirsty: this.becomeThirsty,
      evolve: this.evolve,
    };
  }

  componentDidMount() {
    this.subscribePedometer();
  }

  componentWillUnmount() {
    this.unsubscribePedometer();
  }

  subscribePedometer = () => {
    this.pedometerSubscription = Pedometer.watchStepCount(step => {
      this.walk(step)
    });

    Pedometer.isAvailableAsync().then(
      result => {
        this.setState({
          isPedometerAvailable: String(result)
        });
      },
      error => {
        this.setState({
          isPedometerAvailable: "Could not get isPedometerAvailable: " + error
        });
      }
    );
  };

  unsubscribePedometer = () => {
    this.pedometerSubscription && this.pedometerSubscription.remove();
    this.pedometerSubscription = null;
  };

  /**
   * 걷는 상태로 만든다.
   * 타이머를 두어 일정 시간이 지난 뒤 다시 걷지 않는 상태로 만든다.
   */
  walk(step) {
    if (this.state.isFinding || this.state.isDesiringItem) {
      if (!this.state.isAppForeground) {
        this.setState({ previousStep: step })
        return
      }
    }

    // 타이머가 있었을 시 초기화한다.
    this.clearStopWalkingTimer()

    const dStep = step - this.state.previousStep
    const distanceToItem = Math.max(this.state.distanceToItem - dStep, Constants.FIND_ITEM_DISTANCE)

    // 이미 isWalking이라면 다시 true할 필요 없다.
    const newState = this.state.isWalking
      ? {
        distanceToItem: distanceToItem,
        previousStep: step
      } : {
        distanceToItem: distanceToItem,
        previousStep: step,
        isWalking: true
      }
    this.setState(newState, () => {
      // 타이머를 설정한다.
      this.setStopWalkingTimer()
      // 아이템과의 거리가 FIND_ITEM_DISTANCE 보다 가까워졌을 시 findItem을 실행한다.
      distanceToItem <= Constants.FIND_ITEM_DISTANCE && this.findItem()
    })
  }

  // 걸었다는 신호가 들어온 뒤 WALKING_STOPPER_MILLISECONDS가 지나면 걷지 않는 상태로 만든다.
  setStopWalkingTimer() {
    setTimeout(() => {
      this.setState({ isWalking: false })
    }, Constants.WALKING_STOPPER_MILLISECONDS)
  }

  clearStopWalkingTimer() {
    if (this.walkingStopper) {
      clearTimeout(this.walkingStopper)
      this.walkingStopper = 0
    }
  }

  // 다음 아이템과의 거리를 결정한다.
  generateNextDistance() {
    return Math.max(Math.floor(Math.random() * Constants.MAX_DISTANCE), Constants.FIND_ITEM_DISTANCE + 10)
  }

  hatch() {
    this.setState({ hatchingLevel: 1 }, () => {
      setTimeout(() => {
        this.setState({ hatchingLevel: 2 })
      }, Constants.HATCHING_MILLISECONDS)
    })
  }

  desireItem() {
    this.desireInterval = setInterval(() => {
      if (!this.state.isDesiringItem) {
        this.setState({ isDesiringItem: true })
      }
    }, Constants.GETTING_THIRSTY_MILLISECONDS)
  }

  becomeThirsty() {
    this.drinkInterval = setInterval(() => {
      this.setThirsty()
    }, Constants.GET_THIRSTY_MILLISECONDS)
  }

  // 일정 확률로 목 마른 상태로 만든다.
  setThirsty() {
    const x = Math.random()
    if (x <= Constants.CHANCE_TO_GET_THIRSTY
      && !!this.state.isThirsty) {
      this.setState({ isThirsty: true }, () => {
        // TODO : 목 말라요
        this.setMessage("")
      })
    }
  }

  drink() {
    this.setState({ 
      isDrinking: true,
      isThirsty: false
    }, () => {
      this.setStopDrinkingTimer()
      // TODO : 너도 마실래?
      this.setMessage("")
    })
  }

  setStopDrinkingTimer() {
    setTimeout(() => {
      this.setState({ isDrinking: false })
    }, Constants.DRINKING_STOPPER_MILLISECONDS)
  }

  findItem() {
    this.state.isFinding || this.setState({ isFinding: true })
  }

  pickUpItem() {
    this.setState({ 
      isFinding: false,
      isHappy: true
    }, () => {
      this.setHappyStopper()
      // TODO : 아이템을 얻었다!
      this.setMessage("")
    })
    this.setNextItem()
    this.earnLovePoint()
  }

  setHappyStopper() {
    this.happyStopper = setTimeout(() => {
      this.setState({ isHappy: false })
      this.happyStopper = 0
    }, Constants.HAPPY_STOPPER_MILLISECONDS)
  }

  // 캐릭터의 상태와는 별개로, 다음 아이템은 항상 정해져 있다.
  setNextItem() {
    const nextItemIndex = Math.floor(Math.random() * items.length)
    this.setState({ 
      desiredItemId: items[nextItemIndex].id,
      distanceToItem: this.generateNextDistance()
    })
  }

  earnLovePoint() {
    const lovePoint = this.state.lovePoint + this.state.lovePointToIncrease
    const prevStage = this.state.growthStage
    this.setState({ lovePoint: lovePoint })
  }

  evolve() {
    this.setState(prevState => ({ 
      growthStage: Math.min(prevState.growthStage + 1, this.growthStages.length),
      isEvolving: true
    }), () => {
      this.setStopEvolvingTimer()
      // TODO : 진화했다!
      this.setMessage("")
    })
  }

  setStopEvolvingTimer() {
    setTimeout(() => {
      this.setState({ isEvolving: false })
    }, Constants.EVOLVE_STOPPER_MILLISECONDS)
  }

  setMessage(message) {
    this.setState({ message: message})
  }

  render() {
    const { state, actions } = this;
    const value = { state, actions };

    return <Provider value={value}>{this.props.children}</Provider>;
  }
}

function withState(Component) {
  class ComponentWithContext extends React.Component {
    render() {
        return (
            <Consumer>
                {(value) => <Component {...this.props} homeProvider={value} />}
            </Consumer>
        );
    };
  };
  return ComponentWithContext;
}

export { StateProvider, Consumer, withState };