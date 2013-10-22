

var imageArray = [];

//https://api.imgur.com/3/gallery.json 

$.ajax({ 
    url: 'https://api.imgur.com/3/gallery/user/time/:page.json',
    headers: {
        'Authorization': 'Client-ID 699913a195a439d'
    },
    type: 'GET',
    success: function(data) { 
    	console.log(data);
    	console.log(data.data[0].link);
    		
    for (var i=0; i< data.data.length; i++){
	   if (data.data[i].type == "image/gif") {
	    	var currentImg = data.data[i];
	    	var URL = currentImg.link;
	    	imageArray.push(URL); 
	    	console.log(URL);
	    } 
function displayImg(URL){
	var html = '<img  id = "a' + [i] + '" src="'+ URL + '" alt = "current img" >'
	$(".imgur").prepend(html);
		}
		displayImg(URL);
	

   }
 }
   
   
});


$('.container').jscroll();
	
	
	localStorage.setItem("gifs", JSON.stringify(imageArray));
	JSON.parse(localStorage.getItem("gifs"));


	
	
	var storageFiles = JSON.parse(localStorage.getItem("storageFiles")) || {},
    imageID = document.getElementById("a"),
    storageFilesDate = storageFiles.date,
    date = new Date(),
    todaysDate = (date.getMonth() + 1).toString() + date.getDate().toString();
 
// Compare date and create localStorage if it's not existing/too old   
if (typeof storageFilesDate === "undefined" || storageFilesDate < todaysDate) {
    // Take action when the image has loaded
    imageID.addEventListener("load", function () {
        var imgCanvas = document.createElement("canvas"),
            imgContext = imgCanvas.getContext("2d");
 
        // Make sure canvas is as big as the picture
        imgCanvas.width = imageID.width;
        imgCanvas.height = imageID.height;
 
        // Draw image into canvas element
        imgContext.drawImage(imageID, 0, 0, imageId.width, imageID.height);
 
        // Save image as a data URL
        storageFiles.imageID = imgCanvas.toDataURL("image/gif");
 
        // Set date for localStorage
        storageFiles.date = todaysDate;
 
        // Save as JSON in localStorage
        try {
            localStorage.setItem("storageFiles", JSON.stringify(storageFiles));
        }
        catch (e) {
            console.log("Storage failed: " + e);
        }
    }, false);
 
    // Set initial image src    
  //  imageID.setAttribute("src", "elephant.png");
}
else {
    // Use image from localStorage
   imageID.setAttribute("src", storageFiles.imageID);
}
	
	
//$('#feed').on('click','article',function(){
	
	
	/* var imageId = document.getElementById("a"+[i]);
	console.log(imageId);
	
	imageId.addEventListener("load", function (){
		var imgCanvas = document.createElement("canvas"),
		imgContext = imgCanvas.getContext("2d");
		
		imgCanvas.width = imageId.width;
		imgCanvas.height=imageId.height;
		
		var imgAsDataURL = imgCanvas.toDataURL("image/gif");
		
		try{
			localStorage.setItem("a"+[i], imgAsDataURL);
		}
		catch (e) {
			console.log("Storage failed: " + e);	
		}, false);
		
	}) */
	
	
	
	
