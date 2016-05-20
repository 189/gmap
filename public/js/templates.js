var formTemplate = `<form action="" class="panel hidden" id="panel">
							<label class='item fl' data-type='hotel'>
								<input type="checkbox" name="type[]" class="i-b">
								<span class="i-b">酒店</span>
							</label>
							<label class='item fl' data-type='cate'>
								<input type="checkbox" name="type[]" class="i-b">
								<span class="i-b">米其林</span>
							</label>
							<label class='item fl' data-type='spot'>
								<input type="checkbox" name="type[]" class="i-b">
								<span class="i-b">景点</span>
							</label>
						</form>`;

var loaderTemplate = `<div class="spinner">
						  <div class="spinner-container container1">
						    <div class="circle1"></div>
						    <div class="circle2"></div>
						    <div class="circle3"></div>
						    <div class="circle4"></div>
						  </div>
						  <div class="spinner-container container2">
						    <div class="circle1"></div>
						    <div class="circle2"></div>
						    <div class="circle3"></div>
						    <div class="circle4"></div>
						  </div>
						  <div class="spinner-container container3">
						    <div class="circle1"></div>
						    <div class="circle2"></div>
						    <div class="circle3"></div>
						    <div class="circle4"></div>
						  </div>
						</div>`;

export {formTemplate, loaderTemplate };