// CANVAS settings: ============================================================
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");	// context

// canvas size is full window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// backround tree color
var diagonal = Math.sqrt((canvas.height/2)**2 + (canvas.width/2)**2);	// распространение цвета идёт до угла экрана (см. параметры градиента)
var grad = ctx.createRadialGradient(Math.floor(canvas.width / 2) + 50, canvas.height, 0, Math.floor(canvas.width / 2) + 50, canvas.height, diagonal);	// radial gradient
grad.addColorStop('0', '#051B31');	// dark
grad.addColorStop('1', '#296EB2');	// bright


// MAIN CODE: ##################################################################
// var slider_branch_length, slider_Δangle,	slider_levels, slider_branch_ratio,
		// inner_branch_length, inner_Δangle, inner_levels, inner_branch_ratio,
var nodes = [];		// nodes = [ {x, y, base_angle, branch_length} ];

LoadSettings();
UpdateTree();


// FUNCTIONS: ##################################################################
// MATH functions: =============================================================

function GetLog (x, y) {
	return Math.floor(Math.log(y) / Math.log(x));
}

function GetNewPoint (x, y, angle, branch_length) /* not in use currently */ {
	let new_x = x + (Math.cos((angle * Math.PI) / 180) * branch_length);
	let new_y = y - (Math.sin((angle * Math.PI) / 180) * branch_length);
	return [new_x, new_y];
}

function GetNewX (x, angle, branch_length) {
	return x + (Math.cos((angle * Math.PI) / 180) * branch_length);
}

function GetNewY (y, angle, branch_length) {
	return y - (Math.sin((angle * Math.PI) / 180) * branch_length);
}

// LOGIC functions: ============================================================

function LoadSettings () {
	// объявление самих ползунков
	auto_size_checkbox = document.getElementById('AutoOptimalSize');
	slider_branch_length = document.getElementById('branch_length');
	slider_Δangle = document.getElementById('delta_angle');
	slider_levels = document.getElementById('levels');
	slider_branch_ratio = document.getElementById('branch_ratio');
	slider_padding = document.getElementById('padding');

	// навешивание обработчика событий на все ползунки
	auto_size_checkbox.addEventListener('input', UpdateTreeWithAutoSize);
	slider_branch_length.addEventListener('input', DisactivateAutoBranchSize);	// (важно: должно стоять перед другими обработчиками этого элемента)
	slider_branch_length.addEventListener('input', UpdateTree);										// (сверху: при ручном изменении длины ветвей авторазмер отключается)
	slider_Δangle.addEventListener('input', UpdateTree);
	slider_levels.addEventListener('input', UpdateTree);
	slider_branch_ratio.addEventListener('input', UpdateTree);
	slider_padding.addEventListener('input', UpdateTree);

	// установка значений по умолчанию
	slider_Δangle.min = 0; slider_Δangle.max = 180; 						/**/ slider_Δangle.value = 20;
	slider_levels.min = 0; slider_levels.max = 20; 							/**/ slider_levels.value = 13;
	slider_branch_ratio.min = 0; slider_branch_ratio.max = 100; 			/**/ slider_branch_ratio.value = 86;
	slider_padding.min = 0; slider_padding.max = 100; 						/**/ slider_padding.value = 5;
	auto_size_checkbox.checked = true;										// включен по умолчанию

	slider_branch_length.min = 0; slider_branch_length.max = 200;	// плюсы ниже для перевода данных в целые чила, т.к. 'value' возвращает строку
	slider_branch_length.value = GetOptimalBranchLength(+slider_Δangle.value, +slider_branch_ratio.value, +slider_levels.value, +slider_padding.value);

	// НЕОБЯЗАТЕЛЬНО, ИСКЛЮЧИТЕЛЬНО ДЛЯ УДОБСТВА
	// объявление контейнеров со значениями из ползунков
	inner_branch_length = document.getElementById('branch_length_value');
	inner_Δangle = document.getElementById('delta_angle_value');
	inner_levels = document.getElementById('levels_value');
	inner_branch_ratio = document.getElementById('branch_ratio_value');
	inner_padding = document.getElementById('padding_value');

	// вывод первоначального значения на экран (одноразого, чтобы при загрузке страницы было видно значение)
	DisplaySlidersValues();
}

function GetSettings () {
	return {
		branch_len: Number(slider_branch_length.value),
		levels: Number(slider_levels.value),
		Δangle: Number(slider_Δangle.value),
		branch_ratio: Number(slider_branch_ratio.value) / 100,
		padding: Number(slider_padding.value),

		nodes_number: (Math.pow(2, (Number(slider_levels.value) + 1)) - 1)
	};
}

function GetOptimalBranchLength (Δangle, branch_ratio, levels_quantity, canvas_padding) {
	console.log('Δangle: ' + Δangle + '<br>' +
							'branch_ratio: ' + branch_ratio + '<br>' +
							'canvas_padding: ' + canvas_padding + '<br>' +
							'levels_quantity' + levels_quantity);
	/* При первом запуске программы расчитывает такую длину стартовой ветви,
		 чтобы дерево идеально поместилось на экране. Для этого нужно заранее знать:
			- общий угол отклонения
		 	- коэффицент уменьшения длины ветвей
		 	- кол-во уровней
		 	- отступ внутри холста, чтобы дерево не касалось краёв (для красоты)

		Присутствует небольшая погрешность,
		пердположительно из-за большого кол-ва операций с дробными числами,
		поэтому ветви дерева вылазят за границу на пару пикселей.
		Если сделать относительно большой отступ (>= 10px), погрешности заметно не будет.
	*/

	/* brr = branch_ratio / 100,	// чисто для оптимизации, чтобы каждый раз не возводить в степень
		 brr_n = brr;	// чисто для оптимизации, чтобы каждый раз не возводить в степень (n = "энное")
		 for (let i = 0; i <= levels_quantity; i++) {
			 brr_progression += brr_n;	// сумма прогрессии
			 brr_n *= brr;	// получение след члена последовательности
	 }	// оптимизированнее, но практически не читаем
	 */

	var max_allowed_height = canvas.height - canvas_padding * 2,	// высота "уже обрезанного" хослта
			Δangle_cos = Math.cos((Δangle * Math.PI) / 180),	// по умолчанию косинус принимает радианы, поэтому требуется такое преобразование в градусы
			brr_progression = 0;	// (brr + brr^2 + brr^3 ...)
			for (let i = 1; i <= levels_quantity + 1; i++) {	// +1 -- это ствол, т.к. уровни начитаются с веток
				brr_progression += (branch_ratio / 100) ** i;
			}
	return Math.floor(max_allowed_height / (1 + Δangle_cos * brr_progression));	// Optimal Branch Length
}

function UpdateTree () {
	// clear screen (using full window size white rectangle)
	nodes = [];	// clear array (!!! если закоментить, будет охуенный эффект)
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();

	let settings = GetSettings();
	console.log(settings);
	if (auto_size_checkbox.checked) {
		slider_branch_length.value = GetOptimalBranchLength(
			settings.Δangle,
			settings.branch_ratio * 100,
			settings.levels,
			settings.padding
		);
	}

	DisplaySlidersValues();
	DrawTree(settings);
}

function DisactivateAutoBranchSize () {
	auto_size_checkbox.checked = false;
}

function UpdateTreeWithAutoSize () {
	// to do
}

function DisplaySlidersValues () {
	inner_branch_length.innerHTML = slider_branch_length.value;
	inner_Δangle.innerHTML = slider_Δangle.value;
	inner_levels.innerHTML = slider_levels.value;
	inner_branch_ratio.innerHTML = slider_branch_ratio.value;
	inner_padding.innerHTML = slider_padding.value;
}

// DRAWING functions: ==========================================================

function DrawLine (from, to, level) {
	let line_width = 10 * (1 - (level / 10));
	ctx.strokeStyle = grad;
	ctx.lineWidth = line_width;

	ctx.beginPath();
	ctx.moveTo(from[0], from[1]);
	ctx.lineTo(to[0], to[1]);
	ctx.stroke();
}

function DrawTrunk (branch_length, padding) {		// trunk = ствол
	let start = [Math.floor(canvas.width / 2) + 50, canvas.height - padding];	//	50 -- это кол-во пикселей, чтоб не налазить на область с ползунками
	let end = [start[0], start[1] - branch_length];	//  + Math.floor(ctx.lineWidth / 2) --- нахуя оно тут вообще стояло?
	nodes.push({
		x: end[0],
		y: end[1],
		angle: 90,
		branch_length: branch_length
	});		// 90 = start angle
	DrawLine(start, end, -2);
}

function DrawBranches (nodes_number, Δangle, branch_ratio) {
	let start, old_angle, branch_length, left_branch, right_branch, level;
	for (let i = 0; i < (nodes_number - 2) / 2; i++) {
		start = [nodes[i].x, nodes[i].y];
		old_angle = nodes[i].angle;
		new_branch_length = Math.round(nodes[i].branch_length * branch_ratio);

		left_branch = {
			x: GetNewX(start[0], old_angle + Δangle, new_branch_length),
			y: GetNewY(start[1], old_angle + Δangle, new_branch_length),
			angle: old_angle + Δangle,
			branch_length: new_branch_length
		};

		right_branch = {
			x: GetNewX(start[0], old_angle - Δangle, new_branch_length),
			y: GetNewY(start[1], old_angle - Δangle, new_branch_length),
			angle: old_angle - Δangle,
			branch_length: new_branch_length
		};

		level = GetLog(2, i + 1);		// вычисление глубины узла через логарифм -- Math.floor(log (from 2) to (index + 1))
		nodes.push(left_branch);
		nodes.push(right_branch);
		DrawLine(start, [left_branch.x, left_branch.y], level);
		DrawLine(start, [right_branch.x, right_branch.y], level);
	}
}

function DrawTree (settings) {
	DrawTrunk(settings.branch_len, settings.padding);
	DrawBranches(settings.nodes_number, settings.Δangle, settings.branch_ratio);
}
