const React = require('react');
const Input = require('react-bootstrap').Input;

/**
* This class is derived from the React Component base class to render the
* drag and drop image functionality.
*/
class DragAndDropImage extends React.Component {
	/**
	* Binds the class methods to their respective data.
	* @constructor
	*/
	constructor() {
		super();
		this.handleDragStart = this.handleDragStart.bind(this);
	}
	/**
	* Binds the data of the achievement badge on drag start to the data of the
	* of the achievements displayed on the profile of the editor.
	* @param {object} ev - Passed in the function to be initialized with data
	* onDragStart.
	*/
	handleDragStart(ev) {
		const data = {
			id: this.props.achievementId,
			src: this.props.src,
			name: this.props.achievementName
		};
		ev.dataTransfer.setData('text', JSON.stringify(data));
	}
	/**
	* Renders the DragAndDrop functionality of achievement badges.
	* @returns {ReactElement} a HTML DragAndDrop functionality.
	*/
	render() {
		return (
			<img
				draggable="true"
				height={this.props.height}
				src={this.props.src}
				onDragStart={this.handleDragStart}
			/>
		);
	}
}

DragAndDropImage.displayName = 'DragAndDropImage';
DragAndDropImage.propTypes = {
	achievementId: React.PropTypes.number,
	achievementName: React.PropTypes.string,
	height: React.PropTypes.string,
	src: React.PropTypes.string
};

module.exports = DragAndDropImage;
